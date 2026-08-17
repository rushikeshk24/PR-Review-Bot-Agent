import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GithubAuthService } from './github-auth.service';
import { GithubPRService } from './github-pr.service';
import { GithubChecksService } from './github-checks.service';

@Module({
  imports: [ConfigModule],
  providers: [GithubAuthService, GithubPRService, GithubChecksService],
  exports: [GithubAuthService, GithubPRService, GithubChecksService],
})
export class GithubModule {}
