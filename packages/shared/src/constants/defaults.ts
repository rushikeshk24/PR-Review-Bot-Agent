/**
 * Application-wide default constants.
 */

/** Name shown in GitHub Check Runs and PR review author */
export const APP_NAME = 'CodeLens AI';

/** Check Run name — this is what repo admins add as a required status check */
export const CHECK_RUN_NAME = 'CodeLens AI Review';

/** Override command prefix in PR comments */
export const OVERRIDE_COMMAND = '/codelens override';

/** Maximum annotation count per GitHub Check Run update (API limit) */
export const MAX_ANNOTATIONS_PER_REQUEST = 50;

/** Maximum number of files to process in a single review */
export const MAX_FILES_PER_REVIEW = 50;

/** Maximum diff size (in characters) to send to the LLM in a single call */
export const MAX_DIFF_CHARS_PER_CALL = 120_000;

/** GitHub installation token cache TTL buffer (ms) — refresh token this far before expiry */
export const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

/** Default model IDs per tier */
export const GEMINI_MODELS = {
  flash: 'gemini-2.0-flash',
  pro: 'gemini-1.5-pro',
} as const;

/** GitHub API base URL */
export const GITHUB_API_BASE = 'https://api.github.com';

/** GitHub API version header */
export const GITHUB_API_VERSION = '2022-11-28';
