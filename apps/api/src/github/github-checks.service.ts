import { Injectable, Logger } from '@nestjs/common';
import { GithubAuthService } from './github-auth.service';
import {
  CHECK_RUN_NAME,
  GITHUB_API_BASE,
  GITHUB_API_VERSION,
  MAX_ANNOTATIONS_PER_REQUEST,
} from '@codelens/shared';

export interface CheckAnnotation {
  path: string;
  start_line: number;
  end_line: number;
  annotation_level: 'notice' | 'warning' | 'failure';
  title: string;
  message: string;
  raw_details?: string;
}

export interface CreateCheckRunParams {
  installationId: number;
  owner: string;
  repo: string;
  headSha: string;
  name?: string;
  status?: 'queued' | 'in_progress' | 'completed';
}

export interface CompleteCheckRunParams {
  installationId: number;
  owner: string;
  repo: string;
  checkRunId: number | string;
  conclusion: 'success' | 'failure' | 'neutral' | 'action_required' | 'cancelled' | 'timed_out';
  title: string;
  summary: string;
  text?: string;
  annotations?: CheckAnnotation[];
}

@Injectable()
export class GithubChecksService {
  private readonly logger = new Logger(GithubChecksService.name);

  constructor(private readonly authService: GithubAuthService) {}

  private async getHeaders(installationId: number): Promise<Record<string, string>>{
    const token = await this.authService.getInstallationToken(installationId);
    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': GITHUB_API_VERSION,
      'User-Agent': 'CodeLens-AI-Bot',
    };
  }

  /**
   * Creates an initial Check Run in 'in_progress' status.
   */
  async createCheckRun(params: CreateCheckRunParams): Promise<{ id: number; url: string }> {
    const { installationId, owner, repo, headSha, name = CHECK_RUN_NAME } = params;
    const headers = await this.getHeaders(installationId);
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/check-runs`;

    const body = {
      name,
      head_sha: headSha,
      status: 'in_progress',
      started_at: new Date().toISOString(),
      output: {
        title: 'CodeLens AI Review in Progress',
        summary: 'Analyzing code changes, security rules, and architectural patterns...',
      },
    };

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
      this.logger.error(`Failed to create check run: ${response.status} - ${errorText}`);
      throw new Error(`Failed to create check run: ${response.status}`);
    }

    const data = (await response.json()) as { id: number; html_url: string };
    return { id: data.id, url: data.html_url };
  }

  /**
   * Completes a Check Run with conclusion, summary, and batched code annotations.
   */
  async completeCheckRun(params: CompleteCheckRunParams): Promise<void> {
    const {
      installationId,
      owner,
      repo,
      checkRunId,
      conclusion,
      title,
      summary,
      text,
      annotations = [],
    } = params;

    const headers = await this.getHeaders(installationId);
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/check-runs/${checkRunId}`;

    // GitHub limits annotations to 50 per request
    const firstBatch = annotations.slice(0, MAX_ANNOTATIONS_PER_REQUEST);

    const body: Record<string, any> = {
      name: CHECK_RUN_NAME,
      status: 'completed',
      conclusion,
      completed_at: new Date().toISOString(),
      output: {
        title,
        summary,
        text,
        annotations: firstBatch,
      },
      actions: [
        {
          label: 'Re-analyze',
          description: 'Trigger a fresh AI review run',
          identifier: 're_analyze_pr',
        },
      ],
    };

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Failed to complete check run ${checkRunId}: ${response.status} - ${errorText}`);
      throw new Error(`Failed to complete check run: ${response.status}`);
    }

    // Send remaining annotation batches if more than 50
    for (let i = MAX_ANNOTATIONS_PER_REQUEST; i < annotations.length; i += MAX_ANNOTATIONS_PER_REQUEST) {
      const batch = annotations.slice(i, i + MAX_ANNOTATIONS_PER_REQUEST);
      await fetch(url, {
        method: 'PATCH',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          output: {
            title,
            summary,
            annotations: batch,
          },
        }),
      });
    }
  }

  /**
   * Updates a Check Run for an administrative override.
   */
  async overrideCheckRun(
    installationId: number,
    owner: string,
    repo: string,
    checkRunId: number | string,
    actor: string,
    reason?: string
  ): Promise<void> {
    const headers = await this.getHeaders(installationId);
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/check-runs/${checkRunId}`;

    const overrideNotice = `**Manual Override by @${actor}**${reason ? `: *${reason}*` : ''} at ${new Date().toUTCString()}`;

    const body = {
      conclusion: 'neutral',
      output: {
        title: 'Review Overridden by Admin',
        summary: `The blocking review was manually overridden.\n\n${overrideNotice}`,
      },
    };

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Failed to override check run ${checkRunId}: ${response.status} - ${errorText}`);
      throw new Error(`Failed to override check run: ${response.status}`);
    }
  }
}
