export interface MockInstallation {
  id: string;
  githubInstallationId: number;
  accountType: 'USER' | 'ORGANIZATION';
  accountLogin: string;
  accountId: number;
  accountAvatarUrl: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  repositories: MockRepository[];
  marketplacePlan?: {
    id: string;
    planName: string;
    planTier: string;
    status: string;
  };
}

export interface MockRepoSettings {
  id: string;
  repositoryId: string;
  blockingMode: 'STRICT' | 'ADVISORY';
  severityThreshold: 'CRITICAL' | 'ERROR' | 'WARNING' | 'INFO';
  ignoredGlobs: string[];
  customPrompt: string;
  autoReview: boolean;
  maxFilesPerReview: number;
  modelTier: string;
}

export interface MockRepository {
  id: string;
  installationId: string;
  githubRepoId: number;
  name: string;
  fullName: string;
  isPrivate: boolean;
  defaultBranch: string;
  isActive: boolean;
  settings?: MockRepoSettings;
  _count?: { reviews: number };
  installation?: {
    accountLogin: string;
  };
  reviews?: MockPRReview[];
}

export interface MockFinding {
  file: string;
  line: number;
  endLine?: number;
  severity: 'CRITICAL' | 'ERROR' | 'WARNING' | 'INFO';
  title: string;
  category: string;
  description: string;
  suggestedFix?: string;
}

export interface MockOverride {
  id: string;
  prReviewId: string;
  actor: string;
  reason: string;
  previousConclusion: string;
  newConclusion: string;
  method: string;
  createdAt: string;
  prReview?: {
    pullNumber: number;
    repository?: { fullName: string };
  };
}

export interface MockPRReview {
  id: string;
  repositoryId: string;
  repository?: {
    id: string;
    fullName: string;
    name: string;
    defaultBranch: string;
    installation?: { accountLogin: string };
  };
  pullNumber: number;
  commitSha: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING' | 'FAILED';
  overallScore: number | null;
  blockingIssueCount: number;
  checkRunId: number;
  checkConclusion: 'success' | 'failure' | 'neutral';
  tokensUsed: number;
  modelUsed: string;
  durationMs: number;
  summary: string;
  createdAt: string;
  findings: MockFinding[];
  overrides?: MockOverride[];
}

const now = Date.now();

export const INITIAL_INSTALLATIONS: MockInstallation[] = [
  {
    id: 'inst-1',
    githubInstallationId: 4615691,
    accountType: 'USER',
    accountLogin: 'aakashyadav27',
    accountId: 76722160,
    accountAvatarUrl: 'https://avatars.githubusercontent.com/u/76722160?v=4',
    status: 'ACTIVE',
    marketplacePlan: {
      id: 'plan-1',
      planName: 'Pro Plan',
      planTier: 'pro',
      status: 'ACTIVE',
    },
    repositories: [
      {
        id: 'repo-1',
        installationId: 'inst-1',
        githubRepoId: 2001,
        name: 'core-payment-service',
        fullName: 'aakashyadav27/core-payment-service',
        isPrivate: true,
        defaultBranch: 'main',
        isActive: true,
        settings: {
          id: 'settings-1',
          repositoryId: 'repo-1',
          blockingMode: 'STRICT',
          severityThreshold: 'ERROR',
          ignoredGlobs: ['**/dist/**', '**/*.min.js', '**/fixtures/**'],
          customPrompt: 'Always verify database transactions wrap all credit/debit operations. Strictly enforce ISO 8601 timestamps.',
          autoReview: true,
          maxFilesPerReview: 50,
          modelTier: 'gemini-2.0-flash',
        },
        _count: { reviews: 2 },
      },
      {
        id: 'repo-2',
        installationId: 'inst-1',
        githubRepoId: 2002,
        name: 'web-client',
        fullName: 'aakashyadav27/web-client',
        isPrivate: false,
        defaultBranch: 'main',
        isActive: true,
        settings: {
          id: 'settings-2',
          repositoryId: 'repo-2',
          blockingMode: 'ADVISORY',
          severityThreshold: 'WARNING',
          ignoredGlobs: ['**/node_modules/**', '**/coverage/**'],
          customPrompt: 'Enforce React 18 hooks rules, memoization where appropriate, and WCAG AA accessibility.',
          autoReview: true,
          maxFilesPerReview: 30,
          modelTier: 'gemini-2.0-flash',
        },
        _count: { reviews: 1 },
      },
      {
        id: 'repo-3',
        installationId: 'inst-1',
        githubRepoId: 2003,
        name: 'auth-gateway',
        fullName: 'aakashyadav27/auth-gateway',
        isPrivate: true,
        defaultBranch: 'main',
        isActive: true,
        settings: {
          id: 'settings-3',
          repositoryId: 'repo-3',
          blockingMode: 'STRICT',
          severityThreshold: 'CRITICAL',
          ignoredGlobs: ['**/*.md'],
          customPrompt: 'Strictly check JWT validation, secure cookies, and OWASP security guidelines.',
          autoReview: true,
          maxFilesPerReview: 50,
          modelTier: 'gemini-2.0-flash',
        },
        _count: { reviews: 1 },
      },
    ],
  },
];

export const INITIAL_REVIEWS: MockPRReview[] = [
  {
    id: 'rev-1',
    repositoryId: 'repo-1',
    repository: {
      id: 'repo-1',
      fullName: 'aakashyadav27/core-payment-service',
      name: 'core-payment-service',
      defaultBranch: 'main',
      installation: { accountLogin: 'aakashyadav27' },
    },
    pullNumber: 142,
    commitSha: '8f3b219e4a10c2834b9d0382910fae62',
    status: 'COMPLETED',
    overallScore: 68,
    blockingIssueCount: 1,
    checkRunId: 8820192,
    checkConclusion: 'failure',
    tokensUsed: 4230,
    modelUsed: 'gemini-2.0-flash',
    durationMs: 2400,
    summary:
      'The pull request adds a new session validation handler. However, direct string concatenation is used in the raw SQL query, introducing a critical SQL injection vulnerability that blocks merge in Strict Mode. Parameterized queries must be used instead.',
    createdAt: new Date(now - 3600000 * 3).toISOString(),
    findings: [
      {
        file: 'src/auth/session.service.ts',
        line: 42,
        endLine: 45,
        severity: 'CRITICAL',
        title: 'SQL Injection Vulnerability',
        category: 'security',
        description:
          'Direct string template interpolation in SQL queries allows unsanitized user inputs to execute arbitrary SQL commands. Use parameterized queries ($1, $2) to eliminate injection risk.',
        suggestedFix: "const sql = 'SELECT * FROM sessions WHERE user_id = $1';\nreturn db.query(sql, [userId]);",
      },
      {
        file: 'src/auth/session.service.ts',
        line: 88,
        endLine: 92,
        severity: 'WARNING',
        title: 'Missing Error Handling in Async Cache Handler',
        category: 'reliability',
        description:
          'The async promise is not caught in a try/catch block, which could cause an unhandled promise rejection under Redis downtime.',
        suggestedFix: "try {\n  await redis.setex(`session:${token}`, 3600, JSON.stringify(session));\n} catch (err) {\n  logger.warn('Failed to cache session', err);\n}",
      },
    ],
    overrides: [],
  },
  {
    id: 'rev-2',
    repositoryId: 'repo-1',
    repository: {
      id: 'repo-1',
      fullName: 'aakashyadav27/core-payment-service',
      name: 'core-payment-service',
      defaultBranch: 'main',
      installation: { accountLogin: 'aakashyadav27' },
    },
    pullNumber: 139,
    commitSha: 'e4a210bc93847201bfa8291048201fa8',
    status: 'COMPLETED',
    overallScore: 94,
    blockingIssueCount: 0,
    checkRunId: 8820188,
    checkConclusion: 'success',
    tokensUsed: 3120,
    modelUsed: 'gemini-2.0-flash',
    durationMs: 1850,
    summary:
      'Refactored refund webhook dispatcher. Clean architectural separation, proper input validation using Zod schemas, and comprehensive idempotency checks. Ready for merge.',
    createdAt: new Date(now - 3600000 * 28).toISOString(),
    findings: [
      {
        file: 'src/webhooks/refund.ts',
        line: 18,
        endLine: 20,
        severity: 'INFO',
        title: 'Optional: Add explicit metric counter',
        category: 'observability',
        description: 'Consider incrementing Prometheus counter metrics on successful refund dispatch for observability.',
        suggestedFix: 'metrics.refundsDispatched.inc({ gateway: payload.gateway });',
      },
    ],
    overrides: [],
  },
  {
    id: 'rev-3',
    repositoryId: 'repo-2',
    repository: {
      id: 'repo-2',
      fullName: 'aakashyadav27/web-client',
      name: 'web-client',
      defaultBranch: 'main',
      installation: { accountLogin: 'aakashyadav27' },
    },
    pullNumber: 58,
    commitSha: '9910c2834b9d0382910fae628f3b219e',
    status: 'COMPLETED',
    overallScore: 88,
    blockingIssueCount: 0,
    checkRunId: 8820175,
    checkConclusion: 'success',
    tokensUsed: 2890,
    modelUsed: 'gemini-2.0-flash',
    durationMs: 1600,
    summary:
      'Added responsive navigation drawer for mobile screens. Accessible keyboard navigation implemented. Passes advisory review.',
    createdAt: new Date(now - 3600000 * 48).toISOString(),
    findings: [],
    overrides: [],
  },
  {
    id: 'rev-4',
    repositoryId: 'repo-3',
    repository: {
      id: 'repo-3',
      fullName: 'aakashyadav27/auth-gateway',
      name: 'auth-gateway',
      defaultBranch: 'main',
      installation: { accountLogin: 'aakashyadav27' },
    },
    pullNumber: 22,
    commitSha: 'c182910fae628f3b219e4a10c2834b9d',
    status: 'COMPLETED',
    overallScore: 54,
    blockingIssueCount: 1,
    checkRunId: 8820160,
    checkConclusion: 'neutral',
    tokensUsed: 5100,
    modelUsed: 'gemini-2.0-flash',
    durationMs: 2900,
    summary:
      'Updated OAuth state nonce validation. Manual maintainer override applied with justification: Verified internal staging token rotation.',
    createdAt: new Date(now - 3600000 * 72).toISOString(),
    findings: [
      {
        file: 'src/oauth/nonce.ts',
        line: 29,
        endLine: 34,
        severity: 'CRITICAL',
        title: 'Weak Random Number Generator for CSRF Nonce',
        category: 'security',
        description:
          'Math.random() is cryptographically insecure for generating OAuth state parameters and CSRF nonces. Use crypto.randomBytes() instead.',
        suggestedFix: "import crypto from 'crypto';\nconst nonce = crypto.randomBytes(32).toString('hex');",
      },
    ],
    overrides: [
      {
        id: 'ov-1',
        prReviewId: 'rev-4',
        actor: 'lead-maintainer',
        reason: 'Approved for staging hotfix; cryptographic entropy upgrade will land in follow-up PR #23',
        previousConclusion: 'failure',
        newConclusion: 'neutral',
        method: 'comment',
        createdAt: new Date(now - 3600000 * 70).toISOString(),
      },
    ],
  },
];

export const INITIAL_OVERRIDES: MockOverride[] = [
  {
    id: 'ov-1',
    prReviewId: 'rev-4',
    actor: 'lead-maintainer',
    reason: 'Approved for staging hotfix; cryptographic entropy upgrade will land in follow-up PR #23',
    previousConclusion: 'failure',
    newConclusion: 'neutral',
    method: 'comment',
    createdAt: new Date(now - 3600000 * 70).toISOString(),
    prReview: {
      pullNumber: 22,
      repository: { fullName: 'aakashyadav27/auth-gateway' },
    },
  },
];
