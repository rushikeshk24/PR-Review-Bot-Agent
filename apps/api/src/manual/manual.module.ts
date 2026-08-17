import { Module } from '@nestjs/common';
import { ManualController } from './manual.controller';
import { ManualService } from './manual.service';
import { CodebaseAuditService } from './codebase-audit.service';
import { GithubModule } from '../github/github.module';
import { ReviewModule } from '../review/review.module';

@Module({
  imports: [GithubModule, ReviewModule],
  controllers: [ManualController],
  providers: [ManualService, CodebaseAuditService],
})
export class ManualModule {}
