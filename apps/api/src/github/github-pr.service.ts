import { Injectable, Logger } from '@nestjs/common';
import { GithubAuthService } from './github-auth.service';
import { GITHUB_API_BASE, GITHUB_API_VERSION } from '@codelens/shared';

export interface GithubPRFile {
  sha: string;
  filename: string;
  status: 'added' | 'modified' | 'removed' | 'renamed';
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  raw_url?: string;
  contents_url?: string;
}

export interface InlineComment {
  path: string;
  line: number;
  side?: 'RIGHT' | 'LEFT';
  start_line?: number;
  start_side?: 'RIGHT' | 'LEFT';
  body: string;
}

export interface PostReviewParams {
  installationId: number;
  owner: string;
  repo: string;
  pullNumber: number;
  commitSha: string;
  summary: string;
  event?: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
  comments: InlineComment[];
}

@Injectable()
export class GithubPRService {
  private readonly logger = new Logger(GithubPRService.name);

  constructor(private readonly authService: GithubAuthService) {}

  private async getHeaders(installationId: number): Promise<Record<string, string>> {
    const token = await this.authService.getInstallationToken(installationId);
    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': GITHUB_API_VERSION,
      'User-Agent': 'CodeLens-AI-Bot',
    };
  }

  /**
   * Fetches changed files for a pull request with pagination.
   */
  async getPRFiles(
    installationId: number,
    owner: string,
    repo: string,
    pullNumber: number
  ): Promise<GithubPRFile[]> {
    const headers = await this.getHeaders(installationId);
    const files: GithubPRFile[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls/${pullNumber}/files?page=${page}&per_page=${perPage}`;
      const response = await fetch(url, { headers });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Error fetching PR files: ${response.status} - ${errorText}`);
        throw new Error(`Failed to fetch PR files: ${response.status}`);
      }

      const pageFiles = (await response.json()) as GithubPRFile[];
      files.push(...pageFiles);

      if (pageFiles.length < perPage) {
        break;
      }
      page++;
    }

    return files;
  }

  /**
   * Fetches the raw content of a specific file at a specific commit ref.
   */
  async getFileContent(
    installationId: number,
    owner: string,
    repo: string,
    path: string,
    ref: string
  ): Promise<string | null> {
    try {
      const headers = await this.getHeaders(installationId);
      const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${ref}`;
      const response = await fetch(url, {
        headers: {
          ...headers,
          Accept: 'application/vnd.github.raw',
        },
      });

      if (!response.ok) {
        return null;
      }

      return await response.text();
    } catch (error) {
      this.logger.warn(`Failed to fetch file content for ${path}: ${error}`);
      return null;
    }
  }

  /**
   * Posts a PR review with summary and inline comments.
   */
  async postReview(params: PostReviewParams): Promise<any> {
    const {
      installationId,
      owner,
      repo,
      pullNumber,
      commitSha,
      summary,
      event = 'COMMENT',
      comments,
    } = params;

    const headers = await this.getHeaders(installationId);
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls/${pullNumber}/reviews`;

    const body: Record<string, any> = {
      commit_id: commitSha,
      body: summary,
      event,
    };

    if (comments.length > 0) {
      body.comments = comments.map((c) => ({
        path: c.path,
        line: c.line,
        side: c.side || 'RIGHT',
        ...(c.start_line && c.start_line !== c.line
          ? { start_line: c.start_line, start_side: c.start_side || 'RIGHT' }
          : {}),
        body: c.body,
      }));
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Failed to post PR review: ${response.status} - ${errorText}`);

      // Fallback: If inline comments fail (e.g. line outside diff), post review summary alone
      if (comments.length > 0) {
        this.logger.warn('Falling back to posting summary review without inline comments');
        return this.postReview({
          ...params,
          comments: [],
          summary: `${summary}\n\n*(Note: Some inline comments could not be placed directly on diff lines)*`,
        });
      }

      throw new Error(`Failed to post review: ${response.status} - ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Checks if a user has write/admin permission on a repository.
   */
  async checkUserPermission(
    installationId: number,
    owner: string,
    repo: string,
    username: string
  ): Promise<boolean> {
    try {
      const headers = await this.getHeaders(installationId);
      const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/collaborators/${username}/permission`;
      const response = await fetch(url, { headers });

      if (!response.ok) return false;

      const data = (await response.json()) as { permission: string };
      return ['admin', 'write'].includes(data.permission);
    } catch {
      return false;
    }
  }
}
