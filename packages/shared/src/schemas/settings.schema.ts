import { z } from 'zod';

// ─── Blocking Mode ───

export const BlockingMode = z.enum(['strict', 'advisory']);
export type BlockingMode = z.infer<typeof BlockingMode>;

// ─── Repository Settings ───

export const RepoSettingsSchema = z.object({
  blockingMode: BlockingMode.default('advisory').describe('Whether failed reviews block merge (strict) or only post comments (advisory)'),
  severityThreshold: z.enum(['INFO', 'WARNING', 'ERROR', 'CRITICAL']).default('ERROR')
    .describe('Minimum severity level that counts as a blocking issue in strict mode'),
  ignoredGlobs: z.array(z.string()).default([
    '**/package-lock.json',
    '**/pnpm-lock.yaml',
    '**/yarn.lock',
    '**/*.min.js',
    '**/*.min.css',
    '**/*.map',
    '**/dist/**',
    '**/build/**',
    '**/.next/**',
    '**/node_modules/**',
    '**/*.svg',
    '**/*.png',
    '**/*.jpg',
    '**/*.gif',
    '**/*.ico',
    '**/*.woff',
    '**/*.woff2',
    '**/*.ttf',
    '**/*.eot',
  ]).describe('File glob patterns to exclude from review'),
  customPrompt: z.string().max(2000).optional()
    .describe('Additional instructions appended to the review prompt for this repo'),
  autoReview: z.boolean().default(true)
    .describe('Whether to automatically review PRs on open/push'),
  maxFilesPerReview: z.number().int().min(1).max(100).default(50)
    .describe('Maximum number of files to include in a single review'),
  modelTier: z.enum(['flash', 'pro']).default('flash')
    .describe('Which Gemini model tier to use for reviews'),
});

export type RepoSettings = z.infer<typeof RepoSettingsSchema>;

// ─── Installation Settings (org-wide defaults) ───

export const InstallationSettingsSchema = z.object({
  defaultBlockingMode: BlockingMode.default('advisory'),
  defaultSeverityThreshold: z.enum(['INFO', 'WARNING', 'ERROR', 'CRITICAL']).default('ERROR'),
  defaultIgnoredGlobs: z.array(z.string()).default([]),
  defaultCustomPrompt: z.string().max(2000).optional(),
  defaultAutoReview: z.boolean().default(true),
  defaultModelTier: z.enum(['flash', 'pro']).default('flash'),
});

export type InstallationSettings = z.infer<typeof InstallationSettingsSchema>;
