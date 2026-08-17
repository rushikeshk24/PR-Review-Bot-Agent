import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ReviewJobPayload } from '@codelens/shared';
import { QUEUES } from '../queues/queues.module';
import { prisma } from '@codelens/database';

@Injectable()
export class ReviewService {
  private readonly logger = new Logger(ReviewService.name);

  constructor(
    @InjectQueue(QUEUES.PR_REVIEW) private readonly reviewQueue: Queue<ReviewJobPayload>
  ) {}

  /**
   * Enqueues a PR review job with deduplication key.
   */
  async enqueueReview(payload: ReviewJobPayload): Promise<void> {
    const jobId = `pr-${payload.repoFullName.replace('/', '-')}-${payload.pullNumber}-${payload.headSha}`;

    this.logger.log(`Enqueuing review job ${jobId}`);

    await this.reviewQueue.add('review', payload, {
      jobId,
      removeOnComplete: true,
    });
  }

  /**
   * Fetches recent reviews for a repository.
   */
  async getRepoReviews(repositoryId: string, limit = 20): Promise<any> {
    return prisma.pRReview.findMany({
      where: { repositoryId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        comments: true,
        overrides: true,
      },
    });
  }

  /**
   * Fetches full review details by ID.
   */
  async getReviewById(reviewId: string): Promise<any> {
    return prisma.pRReview.findUnique({
      where: { id: reviewId },
      include: {
        repository: {
          include: { installation: true, settings: true },
        },
        comments: {
          orderBy: { line: 'asc' },
        },
        overrides: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  /**
   * Fetches recent overrides across the system.
   */
  async getRecentOverrides(limit = 50): Promise<any> {
    return prisma.override.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        prReview: {
          include: {
            repository: true,
          },
        },
      },
    });
  }

  /**
   * Fetches full PullRequest details including all iterations and findings.
   */
  async getPullRequestDetails(repositoryId: string, pullNumber: number): Promise<any> {
    return prisma.pullRequest.findUnique({
      where: {
        repositoryId_pullNumber: {
          repositoryId,
          pullNumber,
        },
      },
      include: {
        repository: {
          include: { installation: true, settings: true },
        },
        reviews: {
          orderBy: { iterationNumber: 'desc' },
          include: {
            comments: true,
            overrides: true,
          },
        },
        findings: {
          orderBy: [
            { status: 'asc' }, // OPEN first, then RESOLVED
            { createdAt: 'desc' },
          ],
        },
      },
    });
  }

  /**
   * Fetches all Pull Requests for a repository.
   */
  async getRepoPullRequests(repositoryId: string): Promise<any[]> {
    return prisma.pullRequest.findMany({
      where: { repositoryId },
      orderBy: { updatedAt: 'desc' },
      include: {
        reviews: {
          orderBy: { iterationNumber: 'desc' },
          take: 1,
        },
        _count: {
          select: { reviews: true, findings: true },
        },
      },
    });
  }
}