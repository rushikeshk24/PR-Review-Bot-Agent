import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { prisma } from '@codelens/database';
import { CodeFinding, meetsThreshold } from '@codelens/shared';

export interface ReconcileResult {
  activeFindings: any[];
  resolvedInIteration: any[];
  blockingCount: number;
  isBlocked: boolean;
  totalOpenCount: number;
  totalResolvedCount: number;
}

@Injectable()
export class IssueTrackerService {
  private readonly logger = new Logger(IssueTrackerService.name);

  /**
   * Generates a stable fingerprint for an issue across commits.
   * hash(normalized file path + category + normalized title)
   */
  computeFingerprint(file: string, category: string, title: string): string {
    const normFile = file.trim().toLowerCase().replace(/\\/g, '/');
    const normCat = category.trim().toLowerCase();
    const normTitle = title
      .trim()
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .slice(0, 80);

    const input = `${normFile}::${normCat}::${normTitle}`;
    return crypto.createHash('sha256').update(input).digest('hex').slice(0, 24);
  }

  /**
   * Reconciles findings from a new review iteration against previously tracked issues.
   * - Previously OPEN issues not detected in current diff -> marked RESOLVED
   * - Previously OPEN issues still present -> remain OPEN
   * - Newly detected issues -> created with status OPEN
   */
  async reconcileFindings(params: {
    pullRequestId: string;
    prReviewId: string;
    commitSha: string;
    iterationNumber: number;
    findings: CodeFinding[];
    severityThreshold: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  }): Promise<ReconcileResult> {
    const {
      pullRequestId,
      prReviewId,
      commitSha,
      iterationNumber,
      findings,
      severityThreshold,
    } = params;

    this.logger.log(
      `Reconciling ${findings.length} findings for PR ${pullRequestId} (Iter #${iterationNumber}, SHA: ${commitSha.slice(0, 7)})`
    );

    // 1. Fetch all existing OPEN findings for this PR
    const existingOpenFindings = await prisma.finding.findMany({
      where: {
        pullRequestId,
        status: 'OPEN',
      },
    });

    const existingByFingerprint = new Map(
      existingOpenFindings.map((f) => [f.fingerprint, f])
    );

    const seenFingerprints = new Set<string>();
    const resolvedInIteration: any[] = [];
    const activeFindings: any[] = [];

    // 2. Process all findings from current review iteration
    for (const f of findings) {
      const fingerprint = this.computeFingerprint(f.file, f.category, f.title);
      seenFingerprints.add(fingerprint);

      const isBlocking = meetsThreshold(f.severity, severityThreshold);
      const existing = existingByFingerprint.get(fingerprint);

      if (existing) {
        // Issue is STILL OPEN — update location/context and associate with latest review
        const updated = await prisma.finding.update({
          where: { id: existing.id },
          data: {
            filePath: f.file,
            line: f.line,
            endLine: f.endLine || null,
            description: f.description,
            suggestedFix: f.suggestedFix || null,
            blocking: isBlocking,
            prReviewId,
          },
        });
        activeFindings.push(updated);
      } else {
        // Brand new issue detected in this iteration
        const created = await prisma.finding.create({
          data: {
            pullRequestId,
            prReviewId,
            fingerprint,
            filePath: f.file,
            line: f.line,
            endLine: f.endLine || null,
            severity: f.severity as any,
            category: f.category,
            title: f.title,
            description: f.description,
            suggestedFix: f.suggestedFix || null,
            blocking: isBlocking,
            status: 'OPEN',
            firstSeenSha: commitSha,
            firstSeenIteration: iterationNumber,
          },
        });
        activeFindings.push(created);
      }
    }

    // 3. Any previously OPEN finding that was NOT seen in this iteration is now RESOLVED
    for (const [fp, existingFinding] of existingByFingerprint.entries()) {
      if (!seenFingerprints.has(fp)) {
        const resolved = await prisma.finding.update({
          where: { id: existingFinding.id },
          data: {
            status: 'RESOLVED',
            resolvedSha: commitSha,
            resolvedIteration: iterationNumber,
          },
        });
        resolvedInIteration.push(resolved);
        this.logger.log(
          `Issue "${resolved.title}" (${resolved.filePath}:${resolved.line}) marked RESOLVED in iter #${iterationNumber}`
        );
      }
    }

    // 4. Calculate total PR summary stats
    const allFindingsForPR = await prisma.finding.findMany({
      where: { pullRequestId },
    });

    const openList = allFindingsForPR.filter((f) => f.status === 'OPEN');
    const resolvedList = allFindingsForPR.filter((f) => f.status === 'RESOLVED');
    const blockingCount = openList.filter((f) => f.blocking).length;
    const isBlocked = blockingCount > 0;

    // 5. Update PullRequest parent entity
    await prisma.pullRequest.update({
      where: { id: pullRequestId },
      data: {
        blockingIssueCount: blockingCount,
        totalIssueCount: openList.length + resolvedList.length,
        resolvedIssueCount: resolvedList.length,
        isBlocked,
        currentIteration: iterationNumber,
        headSha: commitSha,
      },
    });

    return {
      activeFindings,
      resolvedInIteration,
      blockingCount,
      isBlocked,
      totalOpenCount: openList.length,
      totalResolvedCount: resolvedList.length,
    };
  }
}
