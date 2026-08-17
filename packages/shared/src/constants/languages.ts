/**
 * Per-language review hints injected into the Gemini prompt based on
 * file extensions detected in the PR diff.
 *
 * These bias the LLM toward language-specific footguns and idioms
 * so it doesn't waste tokens on generic observations.
 */

export interface LanguageHint {
  name: string;
  extensions: string[];
  hints: string[];
}

export const LANGUAGE_HINTS: LanguageHint[] = [
  {
    name: 'TypeScript',
    extensions: ['.ts', '.tsx'],
    hints: [
      'Watch for `any` type usage that undermines type safety — suggest specific types or generics',
      'Check for missing error handling in async/await (unhandled promise rejections crash Node processes)',
      'Flag direct DOM manipulation or innerHTML usage in React components (XSS risk)',
      'Verify that type assertions (`as`) are justified and not masking real type mismatches',
      'Check for missing null/undefined checks when accessing optional chaining results',
      'Flag mutable exports that could cause import-time side effects',
      'Verify that Zod or similar schemas validate external inputs (API responses, form data)',
    ],
  },
  {
    name: 'JavaScript',
    extensions: ['.js', '.jsx', '.mjs', '.cjs'],
    hints: [
      'Flag `var` usage — prefer `const` and `let` for block scoping',
      'Watch for implicit type coercion bugs (== vs ===)',
      'Check for unhandled promise rejections and missing .catch() chains',
      'Flag synchronous filesystem or network operations in server code',
      'Verify that user inputs are sanitized before DOM insertion (XSS)',
    ],
  },
  {
    name: 'Python',
    extensions: ['.py', '.pyi'],
    hints: [
      'Flag f-string or .format() usage in SQL queries (SQL injection risk — use parameterized queries)',
      'Watch for mutable default arguments (def foo(items=[]))',
      'Check for bare except clauses — they catch SystemExit and KeyboardInterrupt',
      'Verify that file handles and database connections use context managers (with statement)',
      'Flag missing type hints in function signatures (public API functions)',
      'Check for improper exception chaining (raise X from Y)',
      'Watch for potential race conditions in threaded code without locks',
    ],
  },
  {
    name: 'Go',
    extensions: ['.go'],
    hints: [
      'Check for unchecked error returns — every error must be explicitly handled or intentionally discarded',
      'Watch for goroutine leaks (goroutines started without cancellation via context.Context)',
      'Flag deferred function calls with side effects that might execute at unexpected times',
      'Verify proper use of sync.Mutex / sync.RWMutex for concurrent map or slice access',
      'Check that context.Context is the first parameter and properly propagated',
      'Watch for shadowed variables from := in inner scopes',
    ],
  },
  {
    name: 'Rust',
    extensions: ['.rs'],
    hints: [
      'Flag .unwrap() and .expect() in library code or production paths — use proper error propagation with ?',
      'Watch for unnecessary cloning that impacts performance',
      'Check that unsafe blocks are minimal, documented, and justified',
      'Verify that error types implement std::error::Error and have meaningful Display',
      'Flag potential deadlocks from nested lock acquisitions',
      'Check for missing Send/Sync bounds on types used across threads',
    ],
  },
  {
    name: 'Java',
    extensions: ['.java'],
    hints: [
      'Check for resource leaks — streams, connections, and readers must be in try-with-resources blocks',
      'Flag potential NullPointerException risks — verify null checks before dereferencing',
      'Watch for thread safety issues with shared mutable state without synchronization',
      'Check for proper equals/hashCode contract when either is overridden',
      'Flag raw type usage with generics (List instead of List<String>)',
      'Verify that exceptions are not silently swallowed in catch blocks',
    ],
  },
  {
    name: 'C#',
    extensions: ['.cs'],
    hints: [
      'Check for missing null checks, especially before async operations — use null-conditional operators',
      'Verify that IDisposable resources use using statements or blocks',
      'Watch for async void methods (should be async Task except for event handlers)',
      'Flag direct string concatenation in loops — use StringBuilder',
      'Check for proper implementation of IEquatable<T> when overriding Equals',
    ],
  },
  {
    name: 'Ruby',
    extensions: ['.rb'],
    hints: [
      'Watch for mass assignment vulnerabilities — check that strong parameters are used in controllers',
      'Flag SQL injection via string interpolation in ActiveRecord queries',
      'Check for missing rescue blocks in critical paths',
      'Verify that private/protected methods are properly scoped',
      'Watch for N+1 query patterns — suggest includes/preload',
    ],
  },
  {
    name: 'PHP',
    extensions: ['.php'],
    hints: [
      'Check for SQL injection — verify parameterized queries or prepared statements are used',
      'Flag direct use of $_GET/$_POST/$_REQUEST without validation/sanitization',
      'Watch for XSS vulnerabilities — ensure htmlspecialchars() or equivalent escaping',
      'Verify that file operations use proper path validation (directory traversal risk)',
      'Check for type juggling issues in comparisons (use === instead of ==)',
    ],
  },
  {
    name: 'Swift',
    extensions: ['.swift'],
    hints: [
      'Flag force unwrapping (!) of optionals — use if-let, guard-let, or nil-coalescing',
      'Watch for retain cycles in closures — check for missing [weak self] or [unowned self]',
      'Verify that throwing functions have proper do-try-catch blocks',
      'Check for main thread violations in UI code called from background queues',
    ],
  },
  {
    name: 'Kotlin',
    extensions: ['.kt', '.kts'],
    hints: [
      'Flag nullable type usage without proper null safety patterns (!!)',
      'Watch for coroutine scope leaks — ensure structured concurrency',
      'Check for missing sealed class/when exhaustiveness',
      'Verify that suspending functions are called from appropriate coroutine contexts',
    ],
  },
  {
    name: 'Shell',
    extensions: ['.sh', '.bash', '.zsh'],
    hints: [
      'Check for unquoted variables that could cause word splitting or glob expansion',
      'Flag missing set -euo pipefail in scripts',
      'Watch for command injection via unsanitized user input in eval/backticks',
      'Verify proper error handling for commands that might fail',
    ],
  },
  {
    name: 'SQL',
    extensions: ['.sql'],
    hints: [
      'Check for missing indexes on columns used in WHERE clauses and JOIN conditions',
      'Flag SELECT * in production queries — specify explicit column lists',
      'Watch for N+1 query patterns in stored procedures',
      'Verify that migrations include both up and down/rollback logic',
    ],
  },
  {
    name: 'YAML/Config',
    extensions: ['.yml', '.yaml', '.toml'],
    hints: [
      'Check for hardcoded secrets, API keys, or passwords',
      'Verify that sensitive values reference environment variables or secret managers',
      'Flag overly permissive security configurations',
    ],
  },
  {
    name: 'Dockerfile',
    extensions: ['Dockerfile', '.dockerfile'],
    hints: [
      'Check for running containers as root — use USER directive',
      'Flag use of :latest tags — pin specific image versions',
      'Verify multi-stage builds for production images to minimize attack surface',
      'Check for secrets or credentials passed as build args',
    ],
  },
];

/**
 * Get review hints for a set of file paths based on their extensions.
 * Returns a formatted string ready to inject into the review prompt.
 */
export function getLanguageHintsForFiles(filePaths: string[]): string {
  const extensions = new Set<string>();
  for (const fp of filePaths) {
    const lastDot = fp.lastIndexOf('.');
    if (lastDot > 0) {
      extensions.add(fp.substring(lastDot).toLowerCase());
    }
    // Handle extensionless files like Dockerfile
    const basename = fp.split('/').pop() || '';
    if (basename === 'Dockerfile' || basename.endsWith('.dockerfile')) {
      extensions.add('Dockerfile');
    }
  }

  const matchedHints: string[] = [];

  for (const lang of LANGUAGE_HINTS) {
    const isMatch = lang.extensions.some((ext) => extensions.has(ext));
    if (isMatch) {
      matchedHints.push(
        `### ${lang.name}-specific checks:\n${lang.hints.map((h) => `- ${h}`).join('\n')}`
      );
    }
  }

  if (matchedHints.length === 0) {
    return '';
  }

  return `\n## Language-Specific Review Guidance\n\n${matchedHints.join('\n\n')}`;
}
