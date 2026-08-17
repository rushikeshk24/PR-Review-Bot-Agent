import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { prisma } from '@codelens/database';
import {
  ReviewJobPayload,
  SEVERITY_CONFIG,
  meetsThreshold,
} from '@codelens/shared';
import { QUEUES } from '../queues/queues.module';
import { GithubPRService, InlineComment } from '../github/github-pr.service';
import { GithubChecksService, CheckAnnotation } from '../github/github-checks.service';
import { ReviewProvider, REVIEW_PROVIDER_TOKEN } from '../ai/review-provider.interface';
import { DiffParserService } from './diff-parser.service';
import { IssueTrackerService } from './issue-tracker.service';

@Processor(QUEUES.PR_REVIEW, { concurrency: 5 })
export class ReviewProcessor extends WorkerHost {
  private readonly logger = new Logger(ReviewProcessor.name);

  constructor(
    private readonly githubPr: GithubPRService,
    private readonly githubChecks: GithubChecksService,
    private readonly diffParser: DiffParserService,
    private readonly issueTracker: IssueTrackerService,
    @Inject(REVIEW_PROVIDER_TOKEN) private readonly reviewProvider: ReviewProvider
  ) {
    super();
  }

  async process(job: Job<ReviewJobPayload>): Promise<any> {
    const startTime = Date.now();
    const {
      installationId,
      repoFullName,
      pullNumber,
      headSha,
      prTitle,
      prDescription,
      prAuthor,
      baseBranch,
      headBranch,
    } = job.data;

    const [owner, repo] = repoFullName.split('/');
    this.logger.log(`Starting review for ${repoFullName}#${pullNumber} (Commit: ${headSha.substring(0, 7)})`);

    // 1. Fetch Repository & Settings from Database
    const repoRecord = await prisma.repository.findFirst({
      where: { fullName: repoFullName },
      include: { settings: true },
    });

    const settings = repoRecord?.settings;
    const blockingMode = settings?.blockingMode || 'STRICT';
    const severityThreshold = (settings?.severityThreshold || 'ERROR') as 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
    const ignoredPatterns = settings?.ignoredGlobs || [];
    const customPrompt = settings?.customPrompt || undefined;

    // 2. Fetch or Create PullRequest entity and calculate current iteration number
    let iterationNumber = 1;
    let pullRequest: any = null;
    if (repoRecord) {
      const existingPR = await prisma.pullRequest.findUnique({
        where: {
          repositoryId_pullNumber: {
            repositoryId: repoRecord.id,
            pullNumber,
          },
        },
        include: {
          reviews: {
            orderBy: { iterationNumber: 'desc' },
            take: 1,
          },
        },
      });

      if (existingPR) {
        iterationNumber = (existingPR.reviews[0]?.iterationNumber || 0) + 1;
        pullRequest = await prisma.pullRequest.update({
          where: { id: existingPR.id },
          data: {
            title: prTitle,
            author: prAuthor,
            baseBranch,
            headBranch,
            headSha,
            currentIteration: iterationNumber,
          },
        });
      } else {
        iterationNumber = 1;
        pullRequest = await prisma.pullRequest.create({
          data: {
            repositoryId: repoRecord.id,
            pullNumber,
            title: prTitle,
            author: prAuthor,
            baseBranch,
            headBranch,
            headSha,
            currentIteration: 1,
          },
        });
      }
    }

    this.logger.log(
      `Reviewing ${repoFullName}#${pullNumber} [Iteration #${iterationNumber}] (Commit: ${headSha.substring(0, 7)})`
    );

    // 3. Create Check Run in progress (skip for manual reviews — installationId=0 means no real installation)
    let checkRunId: number | undefined;
    if (installationId !== 0) {
      try {
        const checkRun = await this.githubChecks.createCheckRun({
          installationId,
          owner,
          repo,
          headSha,
        });
        checkRunId = checkRun.id;
      } catch (checkErr) {
        this.logger.warn(`Could not create initial Check Run: ${checkErr}`);
      }
    }

    // 4. Create initial PRReview database record
    const prReview = repoRecord
      ? await prisma.pRReview.create({
          data: {
            repositoryId: repoRecord.id,
            pullRequestId: pullRequest?.id || null,
            iterationNumber,
            pullNumber,
            commitSha: headSha,
            status: 'IN_PROGRESS',
            checkRunId: checkRunId ? BigInt(checkRunId) : undefined,
          },
        })
      : null;

    try {
      // 5. Fetch PR changed files from GitHub
      const prFiles = await this.githubPr.getPRFiles(installationId, owner, repo, pullNumber);

      // Filter out ignored files & binary files
      const eligibleFiles = prFiles.filter(
        (f) => !this.diffParser.shouldIgnoreFile(f.filename, ignoredPatterns) && (f.patch || f.status === 'added')
      );

      if (eligibleFiles.length === 0) {
        this.logger.log(`No eligible files found to review for ${repoFullName}#${pullNumber}`);
        if (checkRunId && installationId !== 0) {
          await this.githubChecks.completeCheckRun({
            installationId,
            owner,
            repo,
            checkRunId,
            conclusion: 'success',
            title: 'No Reviewable Changes Found',
            summary: 'All modified files are ignored by configuration (lockfiles, assets, build outputs).',
          });
        }
        if (prReview) {
          await prisma.pRReview.update({
            where: { id: prReview.id },
            data: {
              status: 'COMPLETED',
              summary: 'No reviewable changes found (all files ignored).',
              overallScore: 100,
              checkConclusion: 'success',
            },
          });
        }
        return { skipped: true, reason: 'No eligible files' };
      }

      // 6. Call LLM for Structured Analysis
      const reviewResult = await this.reviewProvider.analyze({
        prTitle,
        prDescription,
        prAuthor,
        baseBranch,
        headBranch,
        customPrompt,
        files: eligibleFiles.map((f) => ({
          filename: f.filename,
          status: f.status,
          patch: f.patch,
          additions: f.additions,
          deletions: f.deletions,
        })),
      });

      // 7. Fingerprint & Reconcile Issues across Iterations
      let reconcileResult = {
        activeFindings: [] as any[],
        resolvedInIteration: [] as any[],
        blockingCount: 0,
        isBlocked: false,
        totalOpenCount: 0,
        totalResolvedCount: 0,
      };

      if (pullRequest && prReview) {
        reconcileResult = await this.issueTracker.reconcileFindings({
          pullRequestId: pullRequest.id,
          prReviewId: prReview.id,
          commitSha: headSha,
          iterationNumber,
          findings: reviewResult.findings,
          severityThreshold,
        });
      } else {
        const blocking = reviewResult.findings.filter((f) =>
          meetsThreshold(f.severity, severityThreshold)
        ).length;
        reconcileResult.blockingCount = blocking;
        reconcileResult.isBlocked = blocking > 0;
      }

      // 8. Determine Blocking vs Advisory Conclusion
      let conclusion: 'success' | 'failure' | 'neutral' = 'success';
      if (reconcileResult.isBlocked) {
        conclusion = blockingMode === 'STRICT' ? 'failure' : 'neutral';
      }

      // 9. Map findings to valid inline diff positions
      const inlineComments: InlineComment[] = [];
      const checkAnnotations: CheckAnnotation[] = [];
      const fileValidLinesMap = new Map<string, Set<number>>();

      for (const file of eligibleFiles) {
        fileValidLinesMap.set(file.filename, this.diffParser.getValidLineNumbers(file.patch));
      }

      for (const finding of reviewResult.findings) {
        const validLines = fileValidLinesMap.get(finding.file);
        const resolvedLine = validLines ? this.diffParser.findClosestValidLine(finding.line, validLines) : null;

        const sevInfo = SEVERITY_CONFIG[finding.severity];
        const isBlock = meetsThreshold(finding.severity, severityThreshold);
        const commentBody = `### ${sevInfo.emoji} ${finding.title} (${finding.severity})${isBlock ? ' — ❌ **BLOCKING**' : ''}\n\n${finding.description}${
          finding.suggestedFix ? `\n\n**Suggested Fix:**\n\`\`\`suggestion\n${finding.suggestedFix}\n\`\`\`` : ''
        }`;

        if (resolvedLine) {
          inlineComments.push({
            path: finding.file,
            line: resolvedLine,
            body: commentBody,
          });
        }

        checkAnnotations.push({
          path: finding.file,
          start_line: finding.line,
          end_line: finding.endLine || finding.line,
          annotation_level:
            finding.severity === 'CRITICAL' || finding.severity === 'ERROR'
              ? 'failure'
              : finding.severity === 'WARNING'
                ? 'warning'
                : 'notice',
          title: `[${finding.severity}] ${finding.title}`,
          message: finding.description,
          raw_details: finding.suggestedFix,
        });
      }

      // 10. Build Rich Markdown Summary with Iteration and Resolution details
      const resolvedSection =
        reconcileResult.resolvedInIteration.length > 0
          ? `\n### 🎉 Issues Resolved in this Push (${reconcileResult.resolvedInIteration.length})\n` +
            reconcileResult.resolvedInIteration
              .map((r) => `- ✅ **${r.title}** (\`${r.filePath}:${r.line}\`)`)
              .join('\n') +
            '\n'
          : '';

      const reviewSummaryMarkdown = `## 🔍 CodeLens AI Review Summary (Iteration #${iterationNumber})

**Merge Status:** ${reconcileResult.isBlocked ? '❌ **BLOCKED**' : '✅ **ALLOWED**'}
**Overall Health Score:** **${reviewResult.overallScore}/100**
**Active Issues:** ${reconcileResult.totalOpenCount} open (${reconcileResult.blockingCount} blocking)
${reconcileResult.totalResolvedCount > 0 ? `**Resolved Issues:** ${reconcileResult.totalResolvedCount} resolved` : ''}

${reviewResult.summary}
${resolvedSection}
${
  reviewResult.positiveNotes && reviewResult.positiveNotes.length > 0
    ? `### ✨ Highlights\n${reviewResult.positiveNotes.map((n) => `- ${n}`).join('\n')}\n`
    : ''
}

---
*Powered by CodeLens AI • [View in Dashboard](${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard)*
${reconcileResult.isBlocked && blockingMode === 'STRICT' ? '\n> ⚠️ **Merge Blocked:** Resolve the blocking issues or run `/codelens override [reason]` to dismiss.' : ''}`;

      // 11. Post GitHub PR Review Summary + Inline Comments
      if (installationId !== 0) {
        try {
          await this.githubPr.postReview({
            installationId,
            owner,
            repo,
            pullNumber,
            commitSha: headSha,
            summary: reviewSummaryMarkdown,
            event: reconcileResult.isBlocked && blockingMode === 'STRICT' ? 'REQUEST_CHANGES' : 'COMMENT',
            comments: inlineComments,
          });
        } catch (reviewErr) {
          this.logger.error(`Error posting review comment: ${reviewErr}`);
        }
      } else {
        this.logger.log(`Manual review for ${repoFullName}#${pullNumber} — skipping GitHub comment posting.`);
      }

      // 12. Complete GitHub Check Run with Merge Enforcement
      if (checkRunId && installationId !== 0) {
        const checkTitle =
          reconcileResult.blockingCount === 0
            ? `Review Passed (${reviewResult.overallScore}/100) — Merge Allowed`
            : `${reconcileResult.blockingCount} Blocking Issue(s) — Merge Blocked`;

        await this.githubChecks.completeCheckRun({
          installationId,
          owner,
          repo,
          checkRunId,
          conclusion,
          title: checkTitle,
          summary: reviewSummaryMarkdown,
          text: reviewSummaryMarkdown,
          annotations: checkAnnotations,
        });
      }

      // 13. Persist Review Results & Comments to Database
      const durationMs = Date.now() - startTime;
      if (prReview) {
        await prisma.pRReview.update({
          where: { id: prReview.id },
          data: {
            status: 'COMPLETED',
            summary: reviewResult.summary,
            overallScore: reviewResult.overallScore,
            findings: reviewResult.findings as any,
            blockingIssueCount: reconcileResult.blockingCount,
            resolvedDeltaCount: reconcileResult.resolvedInIteration.length,
            checkConclusion: conclusion,
            modelUsed: this.reviewProvider.getModelName(),
            durationMs,
          },
        });

        if (reviewResult.findings.length > 0) {
          await prisma.reviewComment.createMany({
            data: reviewResult.findings.map((f) => ({
              prReviewId: prReview.id,
              file: f.file,
              line: f.line,
              endLine: f.endLine,
              severity: f.severity as any,
              title: f.title,
              body: f.description,
              suggestedFix: f.suggestedFix,
              category: f.category,
            })),
          });
        }
      }

      this.logger.log(
        `Completed Iteration #${iterationNumber} for ${repoFullName}#${pullNumber} in ${durationMs}ms (Score: ${reviewResult.overallScore}, Blocking: ${reconcileResult.blockingCount}, Conclusion: ${conclusion})`
      );
      return {
        success: true,
        iterationNumber,
        score: reviewResult.overallScore,
        blockingCount: reconcileResult.blockingCount,
        resolvedInIteration: reconcileResult.resolvedInIteration.length,
        conclusion,
      };
    } catch (error: any) {
      this.logger.error(`Review job failed for ${repoFullName}#${pullNumber}: ${error.message}`, error.stack);

      if (checkRunId) {
        await this.githubChecks.completeCheckRun({
          installationId,
          owner,
          repo,
          checkRunId,
          conclusion: 'neutral',
          title: 'Review Encountered an Error',
          summary: `The automated review failed to complete: ${error.message}`,
        });
      }

      if (prReview) {
        await prisma.pRReview.update({
          where: { id: prReview.id },
          data: {
            status: 'FAILED',
            errorMessage: error.message,
          },
        });
      }

      throw error;
    }
  }
}
