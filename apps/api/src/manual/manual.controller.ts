import { Controller, Post, Body } from '@nestjs/common';
import { ManualService } from './manual.service';
import { CodebaseAuditService } from './codebase-audit.service';

@Controller('manual')
export class ManualController {
  constructor(
    private readonly manualService: ManualService,
    private readonly codebaseAuditService: CodebaseAuditService,
  ) {}

  /** POST /manual/repo — fetch open PRs for a public repo */
  @Post('repo')
  async getRepoPRs(@Body() body: { repoUrl: string }) {
    return this.manualService.getRepoAndPRs(body.repoUrl);
  }

  /** POST /manual/review — enqueue AI review for a specific PR */
  @Post('review')
  async triggerReview(@Body() body: {
    owner: string; repo: string; pullNumber: number;
    headSha: string; baseSha: string; prTitle: string;
    prAuthor: string; baseBranch: string; headBranch: string;
  }) {
    return this.manualService.triggerManualReview(
      body.owner, body.repo, body.pullNumber,
      body.headSha, body.baseSha, body.prTitle,
      body.prAuthor, body.baseBranch, body.headBranch,
    );
  }

  /** POST /manual/codebase-audit — full AI audit of an entire public repo */
  @Post('codebase-audit')
  async auditCodebase(@Body() body: { repoUrl: string }) {
    return this.codebaseAuditService.auditCodebase(body.repoUrl);
  }
}
