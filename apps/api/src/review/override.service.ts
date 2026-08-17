import { Injectable, Logger, ForbiddenException, NotFoundException } from '@nestjs/common';
import { prisma } from '@codelens/database';
import { GithubChecksService } from '../github/github-checks.service';
import { GithubPRService } from '../github/github-pr.service';

export interface HandleOverrideParams {
  installationId: number;
  owner: string;
  repo: string;
  pullNumber: number;
  actor: string;
  actorId?: number;
  reason?: string;
  method?: 'comment' | 'dashboard';
}

@Injectable()
export class OverrideService {
  private readonly logger = new Logger(OverrideService.name);

  constructor(
    private readonly githubChecks: GithubChecksService,
    private readonly githubPr: GithubPRService
  ) {}

  /**
   * Processes a manual override request for a blocked PR review.
   */
  async handleOverride(params: HandleOverrideParams): Promise<{ success: boolean; message: string }> {
    const { installationId, owner, repo, pullNumber, actor, actorId, reason, method = 'comment' } = params;
    const fullName = `${owner}/${repo}`;

    this.logger.log(`Override requested for ${fullName}#${pullNumber} by @${actor}`);

    // 1. Verify user permission on the repository (if real installation)
    if (installationId !== 0) {
      const hasWritePermission = await this.githubPr.checkUserPermission(
        installationId,
        owner,
        repo,
        actor
      );

      if (!hasWritePermission) {
        this.logger.warn(`Override rejected: @${actor} lacks write/admin access on ${fullName}`);
        throw new ForbiddenException(`User @${actor} does not have write permission on ${fullName}`);
      }
    }

    // 2. Find repository and latest review record
    const repository = await prisma.repository.findFirst({
      where: { fullName },
      include: {
        reviews: {
          where: { pullNumber },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!repository || repository.reviews.length === 0) {
      throw new NotFoundException(`No review record found for ${fullName}#${pullNumber}`);
    }

    const latestReview = repository.reviews[0];

    // 3. Update GitHub Check Run if present
    if (latestReview.checkRunId && installationId !== 0) {
      await this.githubChecks.overrideCheckRun(
        installationId,
        owner,
        repo,
        latestReview.checkRunId.toString(),
        actor,
        reason
      );
    }

    // 4. Update PRReview, PullRequest state & record Audit Log
    const prevConclusion = latestReview.checkConclusion || 'failure';
    await prisma.$transaction([
      prisma.pRReview.update({
        where: { id: latestReview.id },
        data: {
          checkConclusion: 'neutral',
          status: 'COMPLETED',
          blockingIssueCount: 0,
        },
      }),
      prisma.pullRequest.updateMany({
        where: {
          repositoryId: repository.id,
          pullNumber,
        },
        data: {
          isBlocked: false,
          blockingIssueCount: 0,
        },
      }),
      prisma.override.create({
        data: {
          prReviewId: latestReview.id,
          actor,
          actorId: actorId ? BigInt(actorId) : undefined,
          reason,
          previousConclusion: prevConclusion,
          newConclusion: 'neutral',
          method,
        },
      }),
    ]);

    this.logger.log(`Successfully recorded override for ${fullName}#${pullNumber} by @${actor}`);
    return {
      success: true,
      message: `Review block overridden by @${actor}. Check status updated.`,
    };
  }
}
