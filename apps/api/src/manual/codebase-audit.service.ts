import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { prisma } from '@codelens/database';
import { GITHUB_API_BASE, GITHUB_API_VERSION } from '@codelens/shared';

// Files to skip — not useful for code review
const SKIP_PATTERNS = [
  /^node_modules\//,
  /^\.git\//,
  /^dist\//,
  /^build\//,
  /^\.next\//,
  /^coverage\//,
  /^\.nyc_output\//,
  /package-lock\.json$/,
  /yarn\.lock$/,
  /pnpm-lock\.yaml$/,
  /\.lock$/,
  /\.min\.js$/,
  /\.min\.css$/,
  /\.map$/,
  /\.png$/i, /\.jpg$/i, /\.jpeg$/i, /\.gif$/i, /\.ico$/i,
  /\.svg$/i, /\.woff$/i, /\.woff2$/i, /\.ttf$/i, /\.eot$/i,
  /\.pdf$/i, /\.zip$/i, /\.tar$/i, /\.gz$/i,
  /\.exe$/i, /\.dll$/i, /\.so$/i,
];

// Source file extensions worth reviewing
const SOURCE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.java', '.go', '.rs', '.c', '.cpp', '.h', '.hpp',
  '.rb', '.php', '.cs', '.swift', '.kt', '.scala',
  '.sql', '.graphql', '.gql',
  '.json', '.yaml', '.yml', '.toml', '.env.example',
  '.md', '.sh', '.bash',
]);

const MAX_FILES = 40;
const MAX_FILE_SIZE_BYTES = 80_000; // ~80KB per file
const MAX_TOTAL_CHARS = 120_000;    // ~30k tokens total

@Injectable()
export class CodebaseAuditService {
  private readonly logger = new Logger(CodebaseAuditService.name);
  private readonly genAI: GoogleGenerativeAI;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('gemini.apiKey', '');
    this.model = this.config.get<string>('gemini.defaultModel', 'gemini-2.0-flash');
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  private getHeaders(): Record<string, string> {
    return {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': GITHUB_API_VERSION,
      'User-Agent': 'Rushi-PR-Review-Bot',
    };
  }

  private parseRepoUrl(input: string): { owner: string; repo: string } {
    const trimmed = input.trim().replace(/\/$/, '');
    const urlMatch = trimmed.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2].replace(/\.git$/, '') };
    const slashMatch = trimmed.match(/^([^/]+)\/([^/]+)$/);
    if (slashMatch) return { owner: slashMatch[1], repo: slashMatch[2] };
    throw new BadRequestException('Invalid repo URL. Use https://github.com/owner/repo format.');
  }

  private shouldSkipFile(path: string): boolean {
    return SKIP_PATTERNS.some((p) => p.test(path));
  }

  private hasSourceExtension(path: string): boolean {
    const ext = '.' + path.split('.').pop()?.toLowerCase();
    return SOURCE_EXTENSIONS.has(ext);
  }

  /**
   * Main entry: fetch all files from GitHub, call Gemini, save + return audit.
   */
  async auditCodebase(repoUrl: string): Promise<any> {
    const start = Date.now();
    const { owner, repo } = this.parseRepoUrl(repoUrl);
    const headers = this.getHeaders();

    // 1. Fetch repo metadata
    const repoRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}`, { headers });
    if (repoRes.status === 404) {
      throw new NotFoundException(`Repository "${owner}/${repo}" not found or is private.`);
    }
    if (!repoRes.ok) throw new BadRequestException(`GitHub API error: ${repoRes.status}`);
    const repoData = await repoRes.json() as any;

    if (repoData.private) {
      throw new BadRequestException(`"${owner}/${repo}" is private. Only public repos are supported.`);
    }

    const branch = repoData.default_branch || 'main';

    // 2. Fetch full file tree (recursive)
    this.logger.log(`Fetching file tree for ${owner}/${repo}@${branch}`);
    const treeRes = await fetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
      { headers },
    );
    if (!treeRes.ok) throw new BadRequestException(`Failed to fetch repo tree: ${treeRes.status}`);
    const treeData = await treeRes.json() as any;

    // 3. Filter to reviewable source files, sorted by size ascending
    const allFiles: Array<{ path: string; size: number; sha: string }> = (treeData.tree || [])
      .filter((f: any) =>
        f.type === 'blob' &&
        !this.shouldSkipFile(f.path) &&
        this.hasSourceExtension(f.path) &&
        (f.size || 0) < MAX_FILE_SIZE_BYTES,
      )
      .sort((a: any, b: any) => (b.size || 0) - (a.size || 0))  // largest first = most code
      .slice(0, MAX_FILES);

    if (allFiles.length === 0) {
      throw new BadRequestException('No reviewable source files found in this repository.');
    }

    // 4. Fetch file contents in parallel (batches of 10)
    this.logger.log(`Fetching ${allFiles.length} source files...`);
    const fileContents: Array<{ path: string; content: string }> = [];
    let totalChars = 0;

    for (let i = 0; i < allFiles.length; i += 10) {
      const batch = allFiles.slice(i, i + 10);
      const results = await Promise.all(
        batch.map(async (f) => {
          try {
            const rawRes = await fetch(
              `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${f.path}`,
              { headers: { 'User-Agent': 'Rushi-PR-Review-Bot' } },
            );
            if (!rawRes.ok) return null;
            const text = await rawRes.text();
            return { path: f.path, content: text.slice(0, 20_000) }; // cap per file
          } catch {
            return null;
          }
        }),
      );

      for (const r of results) {
        if (r && totalChars + r.content.length < MAX_TOTAL_CHARS) {
          fileContents.push(r);
          totalChars += r.content.length;
        }
      }
    }

    const totalLines = fileContents.reduce((acc, f) => acc + f.content.split('\n').length, 0);

    // 5. Build Gemini prompt
    const filesBlock = fileContents
      .map((f) => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
      .join('\n\n');

    const prompt = `You are a senior software engineer and security researcher performing a comprehensive codebase audit.

Repository: ${owner}/${repo}
Branch: ${branch}
Description: ${repoData.description || 'N/A'}
Primary Language: ${repoData.language || 'N/A'}
Files analyzed: ${fileContents.length}
Total lines: ${totalLines}

Perform a thorough audit of the ENTIRE codebase below. Identify:
1. Security vulnerabilities (injections, auth issues, exposed secrets, CORS misconfig)
2. Critical bugs (null deref, off-by-one, race conditions, resource leaks)
3. Performance issues (N+1 queries, unoptimized loops, missing indexes)
4. Code quality issues (dead code, duplications, poor error handling)
5. Best practice violations (missing validation, hardcoded values, no tests)

Be specific with file names and line numbers. Focus on HIGH IMPACT issues.

## Codebase:

${filesBlock}
`;

    // 6. Call Gemini with structured schema (with retry + fallback models)
    const schema = {
      type: SchemaType.OBJECT,
      properties: {
        overallScore: { type: SchemaType.INTEGER, description: 'Code health 0-100' },
        summary: { type: SchemaType.STRING, description: '3-4 paragraph executive summary' },
        positives: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: 'What the codebase does well' },
        recommendations: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: 'Top 5 actionable improvements' },
        findings: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              file: { type: SchemaType.STRING },
              line: { type: SchemaType.INTEGER },
              endLine: { type: SchemaType.INTEGER },
              severity: { type: SchemaType.STRING, format: 'enum', enum: ['INFO', 'WARNING', 'ERROR', 'CRITICAL'] },
              category: { type: SchemaType.STRING, format: 'enum', enum: ['security', 'bug', 'performance', 'code-quality', 'best-practice', 'maintainability'] },
              title: { type: SchemaType.STRING },
              description: { type: SchemaType.STRING },
              suggestedFix: { type: SchemaType.STRING },
            },
            required: ['file', 'line', 'severity', 'category', 'title', 'description'],
          },
        },
      },
      required: ['overallScore', 'summary', 'findings'],
    } as any;

    const candidateModels = Array.from(new Set([this.model, 'gemini-flash-latest', 'gemini-2.5-pro', 'gemini-flash-lite-latest']));
    let parsed: any = null;
    let usedModel = this.model;

    for (const modelName of candidateModels) {
      try {
        this.logger.log(`Calling Gemini (${modelName}) for codebase audit of ${owner}/${repo}...`);
        const geminiModel = this.genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: 'You are a world-class software security and code quality auditor. Return detailed, actionable findings in JSON format.',
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: schema,
            temperature: 0.1,
          },
        });

        const geminiResult = await geminiModel.generateContent(prompt);
        const raw = geminiResult.response.text();
        parsed = JSON.parse(raw);
        usedModel = modelName;
        break; // Success!
      } catch (geminiErr: any) {
        this.logger.warn(`Model ${modelName} failed: ${geminiErr.message}. Trying next candidate...`);
        // Small backoff before next attempt
        await new Promise((res) => setTimeout(res, 1500));
      }
    }

    if (!parsed) {
      throw new BadRequestException('AI audit service is currently experiencing high load. Please retry in a few moments.');
    }

    const durationMs = Date.now() - start;

    // 7. Persist to DB
    const audit = await prisma.codebaseAudit.create({
      data: {
        repoFullName: `${owner}/${repo}`,
        repoUrl: repoData.html_url,
        branch,
        commitSha: treeData.sha,
        status: 'COMPLETED',
        overallScore: parsed.overallScore,
        summary: parsed.summary,
        positives: parsed.positives || [],
        recommendations: parsed.recommendations || [],
        findings: parsed.findings,
        fileCount: fileContents.length,
        linesAnalyzed: totalLines,
        modelUsed: this.model,
        durationMs,
      },
    });

    this.logger.log(`Codebase audit complete for ${owner}/${repo} in ${durationMs}ms. Score: ${parsed.overallScore}`);

    return {
      auditId: audit.id,
      repoFullName: audit.repoFullName,
      repoUrl: audit.repoUrl,
      branch,
      overallScore: parsed.overallScore,
      summary: parsed.summary,
      positives: parsed.positives || [],
      recommendations: parsed.recommendations || [],
      findings: parsed.findings || [],
      fileCount: fileContents.length,
      linesAnalyzed: totalLines,
      durationMs,
    };
  }

  /** Fetch past audits for a repo */
  async getAuditHistory(repoFullName: string): Promise<any[]> {
    return prisma.codebaseAudit.findMany({
      where: { repoFullName },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, repoFullName: true, overallScore: true, fileCount: true, createdAt: true, status: true },
    });
  }
}
