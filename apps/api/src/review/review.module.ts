import { Module } from '@nestjs/common';
import { QueuesModule } from '../queues/queues.module';
import { GithubModule } from '../github/github.module';
import { AiModule } from '../ai/ai.module';
import { ReviewService } from './review.service';
import { ReviewProcessor } from './review.processor';
import { DiffParserService } from './diff-parser.service';
import { OverrideService } from './override.service';
import { IssueTrackerService } from './issue-tracker.service';
import { ReviewController } from './review.controller';

@Module({
  imports: [QueuesModule, GithubModule, AiModule],
  controllers: [ReviewController],
  providers: [ReviewService, ReviewProcessor, DiffParserService, OverrideService, IssueTrackerService],
  exports: [ReviewService, OverrideService, DiffParserService, IssueTrackerService],
})
export class ReviewModule {}
