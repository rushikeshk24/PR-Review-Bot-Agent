import { z } from 'zod';

// ─── Severity Levels ───

export const SeverityLevel = z.enum(['INFO', 'WARNING', 'ERROR', 'CRITICAL']);
export type SeverityLevel = z.infer<typeof SeverityLevel>;

export const FindingStatus = z.enum(['OPEN', 'RESOLVED', 'IGNORED']);
export type FindingStatus = z.infer<typeof FindingStatus>;

// ─── Individual Code Finding ───

export const CodeFindingSchema = z.object({
  file: z.string().describe('Relative file path in the repository'),
  line: z.number().int().positive().describe('Line number where the issue starts'),
  endLine: z.number().int().positive().optional().describe('Line number where the issue ends (for multi-line issues)'),
  severity: SeverityLevel.describe('Severity of the finding'),
  title: z.string().max(200).describe('Brief title summarizing the issue'),
  description: z.string().describe('Detailed explanation of the issue and why it matters'),
  suggestedFix: z.string().optional().describe('Suggested code fix or corrective action'),
  blocking: z.boolean().optional().describe('Whether this finding blocks merge'),
  category: z.enum([
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
  ]).describe('Category of the finding'),
});

export type CodeFinding = z.infer<typeof CodeFindingSchema>;

// ─── Full PR Review Result ───

export const PRReviewResultSchema = z.object({
  summary: z.string().describe('High-level summary of the PR changes, quality assessment, and key concerns'),
  overallScore: z.number().int().min(0).max(100).describe('Code quality score from 0 (critical issues) to 100 (excellent)'),
  findings: z.array(CodeFindingSchema).describe('List of specific issues found during review'),
  blockingIssueCount: z.number().int().min(0).describe('Number of findings with severity ERROR or CRITICAL that should block merge'),
  positiveNotes: z.array(z.string()).optional().describe('Notable positive aspects of the code changes'),
});

export type PRReviewResult = z.infer<typeof PRReviewResultSchema>;

// ─── Review Input (sent to LLM) ───

export const ReviewInputSchema = z.object({
  prTitle: z.string(),
  prDescription: z.string().optional(),
  prAuthor: z.string(),
  baseBranch: z.string(),
  headBranch: z.string(),
  files: z.array(z.object({
    filename: z.string(),
    status: z.enum(['added', 'modified', 'removed', 'renamed']),
    patch: z.string().optional(),
    fullContent: z.string().optional(),
    additions: z.number().int(),
    deletions: z.number().int(),
  })),
  languageHints: z.string().optional(),
  customPrompt: z.string().optional(),
  repoContext: z.string().optional(),
});

export type ReviewInput = z.infer<typeof ReviewInputSchema>;

// ─── Review Job Payload (queue) ───

export const ReviewJobPayloadSchema = z.object({
  installationId: z.number(),
  repositoryId: z.string(),
  repoFullName: z.string(),
  pullNumber: z.number().int(),
  headSha: z.string(),
  baseSha: z.string().optional(),
  action: z.enum(['opened', 'synchronize', 'reopened', 'ready_for_review', 'rerequested']),
  prTitle: z.string(),
  prDescription: z.string().optional(),
  prAuthor: z.string(),
  baseBranch: z.string(),
  headBranch: z.string(),
});

export type ReviewJobPayload = z.infer<typeof ReviewJobPayloadSchema>;

// ─── Review Status ───

export const ReviewStatus = z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED']);
export type ReviewStatus = z.infer<typeof ReviewStatus>;
