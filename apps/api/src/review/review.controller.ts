import { Controller, Get, Post, Body, Param, Query, NotFoundException } from '@nestjs/common';
import { ReviewService } from './review.service';
import { OverrideService } from './override.service';

@Controller('reviews')
export class ReviewController {
  constructor(
    private readonly reviewService: ReviewService,
    private readonly overrideService: OverrideService
  ) {}

  @Get('overrides')
  async getOverrides(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    return this.reviewService.getRecentOverrides(parsedLimit);
  }

  /**
   * GET /reviews/pr/:repoId/:pullNumber
   * Fetches full PR lifecycle details including all review iterations and findings.
   */
  @Get('pr/:repoId/:pullNumber')
  async getPullRequest(
    @Param('repoId') repoId: string,
    @Param('pullNumber') pullNumber: string
  ) {
    const pr = await this.reviewService.getPullRequestDetails(repoId, parseInt(pullNumber, 10));
    if (!pr) {
      throw new NotFoundException(`Pull Request #${pullNumber} not found for repo ${repoId}`);
    }
    return pr;
  }

  /**
   * GET /reviews/repo/:repoId/prs
   * Lists all pull requests tracked for a repository.
   */
  @Get('repo/:repoId/prs')
  async getRepoPullRequests(@Param('repoId') repoId: string) {
    return this.reviewService.getRepoPullRequests(repoId);
  }

  /**
   * POST /reviews/override
   * Applies manual merge block override from Dashboard or API.
   */
  @Post('override')
  async overrideReview(
    @Body()
    body: {
      installationId: number;
      owner: string;
      repo: string;
      pullNumber: number;
      actor: string;
      reason?: string;
    }
  ) {
    return this.overrideService.handleOverride({
      ...body,
      method: 'dashboard',
    });
  }

  @Get(':id')
  async getReview(@Param('id') id: string) {
    const review = await this.reviewService.getReviewById(id);
    if (!review) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }
    return review;
  }
}
