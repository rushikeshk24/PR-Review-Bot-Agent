import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { prisma } from '@codelens/database';
import { ReviewService } from '../review/review.service';
import { GithubAuthService } from '../github/github-auth.service';
import { GITHUB_API_BASE, GITHUB_API_VERSION } from '@codelens/shared';

// Sentinel githubInstallationId for manually-triggered reviews (no real installation)
const MANUAL_INSTALLATION_ID = BigInt(0);

@Injectable()
export class ManualService {
  private readonly logger = new Logger(ManualService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly reviewService: ReviewService,
    private readonly authService: GithubAuthService,
  ) {}

  /** Headers for public GitHub API calls — no auth needed for public repos */
  private getPublicHeaders(): Record<string, string> {
    return {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': GITHUB_API_VERSION,
      'User-Agent': 'Rushi-PR-Review-Bot',
    };
  }

  parseRepoUrl(input: string): { owner: string; repo: string } {
    const trimmed = input.trim().replace(/\/$/, '');
    const urlMatch = trimmed.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (urlMatch) {
      return { owner: urlMatch[1], repo: urlMatch[2].replace(/\.git$/, '') };
    }
    const slashMatch = trimmed.match(/^([^/]+)\/([^/]+)$/);
    if (slashMatch) {
      return { owner: slashMatch[1], repo: slashMatch[2] };
    }
    throw new BadRequestException(
      'Invalid repo URL. Use https://github.com/owner/repo or owner/repo format.',
    );
  }

  async getRepoAndPRs(repoUrl: string): Promise<any> {
    const { owner, repo } = this.parseRepoUrl(repoUrl);
    const headers = this.getPublicHeaders();

    const repoRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}`, { headers });

    if (repoRes.status === 404) {
      throw new NotFoundException(
        `Repository "${owner}/${repo}" not found. It may be private or does not exist.`,
      );
    }
    if (!repoRes.ok) {
      const text = await repoRes.text();
      throw new BadRequestException(`GitHub API error: ${repoRes.status} - ${text}`);
    }

    const repoData = await repoRes.json() as any;

    if (repoData.private) {
      throw new BadRequestException(
        `"${owner}/${repo}" is a private repository. Install the GitHub App on it first to enable reviews.`,
      );
    }

    const prsRes = await fetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls?state=open&per_page=30&sort=updated&direction=desc`,
      { headers },
    );
    const prsData = prsRes.ok ? (await prsRes.json() as any[]) : [];

    return {
      repo: {
        owner,
        name: repoData.name,
        fullName: repoData.full_name,
        description: repoData.description,
        stars: repoData.stargazers_count,
        forks: repoData.forks_count,
        language: repoData.language,
        defaultBranch: repoData.default_branch,
        isPrivate: repoData.private,
        url: repoData.html_url,
      },
      prs: prsData.map((pr: any) => ({
        number: pr.number,
        title: pr.title,
        author: pr.user?.login,
        authorAvatar: pr.user?.avatar_url,
        headSha: pr.head?.sha,
        baseSha: pr.base?.sha,
        baseBranch: pr.base?.ref,
        headBranch: pr.head?.ref,
        draft: pr.draft,
        updatedAt: pr.updated_at,
        url: pr.html_url,
      })),
    };
  }

  async triggerManualReview(
    owner: string,
    repo: string,
    pullNumber: number,
    headSha: string,
    baseSha: string,
    prTitle: string,
    prAuthor: string,
    baseBranch: string,
    headBranch: string,
  ): Promise<{ status: string; jobId: string }> {
    const fullName = `${owner}/${repo}`;

    const installation = await prisma.installation.upsert({
      where: { githubInstallationId: MANUAL_INSTALLATION_ID },
      update: {},
      create: {
        githubInstallationId: MANUAL_INSTALLATION_ID,
        accountType: 'USER',
        accountLogin: 'manual',
        accountId: BigInt(0),
        settings: { create: {} },
        marketplacePlan: { create: { planName: 'free', planTier: 'free' } },
      },
    });

    const headers = this.getPublicHeaders();
    const repoRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}`, { headers });
    const repoData = repoRes.ok ? (await repoRes.json() as any) : null;

    const repoRecord = await prisma.repository.upsert({
      where: {
        installationId_githubRepoId: {
          installationId: installation.id,
          githubRepoId: BigInt(repoData?.id || 0),
        },
      },
      update: { name: repo, fullName, defaultBranch: repoData?.default_branch || 'main' },
      create: {
        installationId: installation.id,
        githubRepoId: BigInt(repoData?.id || 0),
        name: repo,
        fullName,
        isPrivate: false,
        defaultBranch: repoData?.default_branch || 'main',
        settings: { create: { blockingMode: 'ADVISORY', severityThreshold: 'ERROR' } },
      },
    });

    await this.reviewService.enqueueReview({
      installationId: 0,
      repositoryId: repoRecord.id,
      repoFullName: fullName,
      pullNumber,
      headSha,
      baseSha,
      action: 'opened',
      prTitle,
      prAuthor,
      baseBranch,
      headBranch,
    });

    const jobId = `pr-${fullName.replace('/', '-')}-${pullNumber}-${headSha.slice(0, 7)}`;
    this.logger.log(`Manually enqueued review for ${fullName}#${pullNumber}`);
    return { status: 'queued', jobId };
  }
}
