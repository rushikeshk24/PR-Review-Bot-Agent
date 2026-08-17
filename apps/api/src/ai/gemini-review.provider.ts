import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, SchemaType, ResponseSchema } from '@google/generative-ai';
import {
  PRReviewResult,
  PRReviewResultSchema,
  ReviewInput,
  getLanguageHintsForFiles,
} from '@codelens/shared';
import { ReviewProvider } from './review-provider.interface';

@Injectable()
export class GeminiReviewProvider implements ReviewProvider {
  private readonly logger = new Logger(GeminiReviewProvider.name);
  private readonly genAI: GoogleGenerativeAI;
  private readonly defaultModel: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('gemini.apiKey', '');
    this.defaultModel = this.config.get<string>('gemini.defaultModel', 'gemini-2.0-flash');
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  getModelName(): string {
    return this.defaultModel;
  }

  estimateTokens(input: ReviewInput): number {
    const totalChars = input.files.reduce((acc, f) => acc + (f.patch?.length || 0) + (f.fullContent?.length || 0), 0);
    return Math.ceil(totalChars / 4);
  }

  private buildSystemInstruction(): string {
    return `You are CodeLens AI, an expert staff software engineer and rigorous security researcher performing automated code reviews on GitHub Pull Requests.

Your mission:
1. Identify high-impact bugs, security vulnerabilities (SQLi, XSS, SSRF, IDOR, auth bypass), race conditions, resource leaks, memory safety bugs, performance regressions, and broken API contracts.
2. DO NOT nitpick purely cosmetic formatting, indentation, or style conventions already enforced by linters.
3. Be precise with file paths and line numbers. Line numbers MUST point to valid modified lines in the pull request diff.
4. For every issue found, provide a clear, actionable explanation and a concrete suggested fix.
5. Provide an accurate overall code quality score (0 to 100) and count of blocking issues (severity ERROR or CRITICAL).`;
  }

  private getResponseSchema(): ResponseSchema {
    return {
      type: SchemaType.OBJECT,
      properties: {
        summary: {
          type: SchemaType.STRING,
          description: 'A clear 2-3 paragraph summary of PR changes, overall architecture impact, and critical findings.',
        },
        overallScore: {
          type: SchemaType.INTEGER,
          description: 'Overall code health score from 0 (broken/severe risk) to 100 (clean/excellent).',
        },
        blockingIssueCount: {
          type: SchemaType.INTEGER,
          description: 'Count of findings with severity ERROR or CRITICAL.',
        },
        positiveNotes: {
          type: SchemaType.ARRAY,
          description: 'Optional positive observations about architecture, performance, or testing in the PR.',
          items: { type: SchemaType.STRING },
        },
        findings: {
          type: SchemaType.ARRAY,
          description: 'List of specific code findings.',
          items: {
            type: SchemaType.OBJECT,
            properties: {
              file: { type: SchemaType.STRING, description: 'Relative path of the file.' },
              line: { type: SchemaType.INTEGER, description: 'Target start line number in the modified code.' },
              endLine: { type: SchemaType.INTEGER, description: 'Target end line number if multi-line issue.' },
              severity: {
                type: SchemaType.STRING,
                format: 'enum',
                enum: ['INFO', 'WARNING', 'ERROR', 'CRITICAL'],
                description: 'Severity level.',
              },
              category: {
                type: SchemaType.STRING,
                format: 'enum',
                enum: [
                  'bug',
                  'security',
                  'performance',
                  'error-handling',
                  'logic',
                  'type-safety',
                  'concurrency',
                  'api-misuse',
                  'readability',
                  'best-practice',
                ],
                description: 'Category classification.',
              },
              title: { type: SchemaType.STRING, description: 'Short descriptive title of the issue.' },
              description: { type: SchemaType.STRING, description: 'Detailed explanation of why this is an issue and potential impact.' },
              suggestedFix: { type: SchemaType.STRING, description: 'Concrete code suggestion or replacement.' },
            },
            required: ['file', 'line', 'severity', 'category', 'title', 'description'],
          },
        },
      },
      required: ['summary', 'overallScore', 'blockingIssueCount', 'findings'],
    } as any;
  }

  async analyze(input: ReviewInput): Promise<PRReviewResult> {
    const filePaths = input.files.map((f) => f.filename);
    const languageHints = getLanguageHintsForFiles(filePaths);

    const model = this.genAI.getGenerativeModel({
      model: this.defaultModel,
      systemInstruction: this.buildSystemInstruction(),
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: this.getResponseSchema(),
        temperature: 0.15,
      },
    });

    const diffBlocks = input.files
      .filter((f) => f.patch || f.fullContent)
      .map((f) => {
        let block = `### File: ${f.filename} (${f.status}, +${f.additions}/-${f.deletions})\n`;
        if (f.patch) {
          block += `\`\`\`diff\n${f.patch}\n\`\`\`\n`;
        }
        return block;
      })
      .join('\n\n');

    const prompt = `# Pull Request Review Request
**PR Title:** ${input.prTitle}
**Author:** ${input.prAuthor}
**Target Branch:** ${input.baseBranch} <- **Source Branch:** ${input.headBranch}
${input.prDescription ? `**Description:**\n${input.prDescription}\n` : ''}
${input.customPrompt ? `\n## Repository-Specific Rules:\n${input.customPrompt}\n` : ''}
${languageHints}

## Changed Files & Diffs to Review:
${diffBlocks}
`;

    this.logger.debug(`Sending ${input.files.length} files to Gemini (${this.defaultModel})`);

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    try {
      const parsedJson = JSON.parse(responseText);
      const validated = PRReviewResultSchema.parse(parsedJson);

      // Re-verify blockingIssueCount calculation
      const calculatedBlocking = validated.findings.filter((f) =>
        ['ERROR', 'CRITICAL'].includes(f.severity)
      ).length;

      return {
        ...validated,
        blockingIssueCount: calculatedBlocking,
      };
    } catch (parseError) {
      this.logger.error(`Error parsing Gemini structured response: ${parseError}\nRaw: ${responseText}`);
      throw new Error(`Failed to parse AI review output: ${parseError}`);
    }
  }
}
