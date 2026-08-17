import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@codelens/database';
import { OVERRIDE_COMMAND } from '@codelens/shared';
import { ReviewService } from '../review/review.service';
import { OverrideService } from '../review/override.service';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly reviewService: ReviewService,
    private readonly overrideService: OverrideService
  ) {}

  /**
   * Dispatches incoming GitHub webhook events based on the `x-github-event` header.
   */
  async handleEvent(event: string, deliveryId: string, payload: any): Promise<any> {
    this.logger.log(`Handling GitHub event: '${event}' (action: ${payload?.action}, delivery: ${deliveryId})`);

    switch (event) {
      case 'pull_request':
        return this.handlePullRequest(payload);

      case 'installation':
        return this.handleInstallation(payload);

      case 'installation_repositories':
        return this.handleInstallationRepositories(payload);

      case 'issue_comment':
        return this.handleIssueComment(payload);

      case 'check_run':
        return this.handleCheckRun(payload);

      case 'marketplace_purchase':
        return this.handleMarketplacePurchase(payload);

      default:
        this.logger.debug(`Unhandled event type: ${event}`);
        return { status: 'ignored', event };
    }
  }

  private async handlePullRequest(payload: any) {
    const { action, pull_request, repository, installation } = payload;
    if (action === 'closed') {
      const repoRecord = await prisma.repository.findFirst({
        where: { fullName: repository.full_name },
      });
      if (repoRecord) {
        await prisma.pullRequest.updateMany({
          where: { repositoryId: repoRecord.id, pullNumber: pull_request.number },
          data: { state: pull_request.merged ? 'MERGED' : 'CLOSED' },
        });
      }
      return { status: 'processed', action: 'closed', merged: pull_request.merged };
    }

    const reviewableActions = ['opened', 'synchronize', 'reopened', 'ready_for_review'];

    if (!reviewableActions.includes(action)) {
      this.logger.debug(`Ignoring PR action '${action}' for ${repository?.full_name}#${pull_request?.number}`);
      return { status: 'skipped', reason: `Action ${action} not eligible for review` };
    }

    if (pull_request.draft) {
      this.logger.debug(`PR #${pull_request.number} is in draft mode. Skipping review.`);
      return { status: 'skipped', reason: 'Draft PR' };
    }

    if (!installation?.id) {
      this.logger.warn(`No installation ID on PR webhook for ${repository?.full_name}`);
      return { status: 'skipped', reason: 'No installation ID' };
    }

    // Ensure repository record exists in DB
    const repoRecord = await prisma.repository.upsert({
      where: {
        installationId_githubRepoId: {
          installationId: installation.id.toString(),
          githubRepoId: BigInt(repository.id),
        },
      },
      update: {
        name: repository.name,
        fullName: repository.full_name,
        isPrivate: repository.private,
        defaultBranch: repository.default_branch || 'main',
      },
      create: {
        installation: {
          connectOrCreate: {
            where: { githubInstallationId: BigInt(installation.id) },
            create: {
              githubInstallationId: BigInt(installation.id),
              accountType: repository.owner?.type === 'Organization' ? 'ORGANIZATION' : 'USER',
              accountLogin: repository.owner?.login || 'unknown',
              accountId: BigInt(repository.owner?.id || 0),
            },
          },
        },
        githubRepoId: BigInt(repository.id),
        name: repository.name,
        fullName: repository.full_name,
        isPrivate: repository.private,
        defaultBranch: repository.default_branch || 'main',
        settings: {
          create: {
            blockingMode: 'ADVISORY',
            severityThreshold: 'ERROR',
          },
        },
      },
      include: { settings: true },
    });

    if (repoRecord.settings && !repoRecord.settings.autoReview) {
      this.logger.log(`Auto review disabled for repo ${repository.full_name}. Skipping.`);
      return { status: 'skipped', reason: 'Auto-review disabled' };
    }

    await this.reviewService.enqueueReview({
      installationId: installation.id,
      repositoryId: repoRecord.id,
      repoFullName: repository.full_name,
      pullNumber: pull_request.number,
      headSha: pull_request.head.sha,
      baseSha: pull_request.base.sha,
      action: action as any,
      prTitle: pull_request.title,
      prDescription: pull_request.body || undefined,
      prAuthor: pull_request.user?.login || 'unknown',
      baseBranch: pull_request.base?.ref || 'main',
      headBranch: pull_request.head?.ref || 'head',
    });

    return { status: 'enqueued', pr: pull_request.number };
  }

  private async handleInstallation(payload: any) {
    const { action, installation, repositories } = payload;
    const instId = BigInt(installation.id);

    if (action === 'created') {
      const dbInst = await prisma.installation.upsert({
        where: { githubInstallationId: instId },
        update: {
          status: 'ACTIVE',
          accountLogin: installation.account.login,
          accountId: BigInt(installation.account.id),
          accountAvatarUrl: installation.account.avatar_url,
          permissions: installation.permissions || {},
          events: installation.events || [],
          repositorySelection: installation.repository_selection || 'all',
        },
        create: {
          githubInstallationId: instId,
          accountType: installation.account.type === 'Organization' ? 'ORGANIZATION' : 'USER',
          accountLogin: installation.account.login,
          accountId: BigInt(installation.account.id),
          accountAvatarUrl: installation.account.avatar_url,
          permissions: installation.permissions || {},
          events: installation.events || [],
          repositorySelection: installation.repository_selection || 'all',
          settings: {
            create: {},
          },
          marketplacePlan: {
            create: {
              planName: 'free',
              planTier: 'free',
            },
          },
        },
      });

      if (repositories && repositories.length > 0) {
        for (const repo of repositories) {
          await prisma.repository.upsert({
            where: {
              installationId_githubRepoId: {
                installationId: dbInst.id,
                githubRepoId: BigInt(repo.id),
              },
            },
            update: {
              name: repo.name,
              fullName: repo.full_name,
              isPrivate: repo.private,
            },
            create: {
              installationId: dbInst.id,
              githubRepoId: BigInt(repo.id),
              name: repo.name,
              fullName: repo.full_name,
              isPrivate: repo.private,
              settings: {
                create: {},
              },
            },
          });
        }
      }
    } else if (action === 'deleted') {
      await prisma.installation.updateMany({
        where: { githubInstallationId: instId },
        data: { status: 'DELETED' },
      });
    } else if (action === 'suspend') {
      await prisma.installation.updateMany({
        where: { githubInstallationId: instId },
        data: { status: 'SUSPENDED' },
      });
    } else if (action === 'unsuspend') {
      await prisma.installation.updateMany({
        where: { githubInstallationId: instId },
        data: { status: 'ACTIVE' },
      });
    }

    return { status: 'processed', action };
  }

  private async handleInstallationRepositories(payload: any) {
    const { installation, repositories_added = [], repositories_removed = [] } = payload;
    const dbInst = await prisma.installation.findUnique({
      where: { githubInstallationId: BigInt(installation.id) },
    });

    if (!dbInst) return { status: 'not_found' };

    for (const repo of repositories_added) {
      await prisma.repository.upsert({
        where: {
          installationId_githubRepoId: {
            installationId: dbInst.id,
            githubRepoId: BigInt(repo.id),
          },
        },
        update: {
          name: repo.name,
          fullName: repo.full_name,
          isPrivate: repo.private,
          isActive: true,
        },
        create: {
          installationId: dbInst.id,
          githubRepoId: BigInt(repo.id),
          name: repo.name,
          fullName: repo.full_name,
          isPrivate: repo.private,
          settings: {
            create: {},
          },
        },
      });
    }

    for (const repo of repositories_removed) {
      await prisma.repository.updateMany({
        where: {
          installationId: dbInst.id,
          githubRepoId: BigInt(repo.id),
        },
        data: { isActive: false },
      });
    }

    return { status: 'synced' };
  }

  private async handleIssueComment(payload: any) {
    const { action, issue, comment, repository, installation, sender } = payload;

    // We only care about newly created comments on Pull Requests
    if (action !== 'created' || !issue.pull_request || !comment.body) {
      return { status: 'ignored' };
    }

    const commentBody = comment.body.trim();
    if (!commentBody.startsWith(OVERRIDE_COMMAND)) {
      return { status: 'ignored' };
    }

    if (!installation?.id) {
      this.logger.warn('No installation found on override comment webhook');
      return { status: 'error', message: 'No installation ID' };
    }

    const reason = commentBody.substring(OVERRIDE_COMMAND.length).trim() || undefined;
    const [owner, repo] = repository.full_name.split('/');

    return this.overrideService.handleOverride({
      installationId: installation.id,
      owner,
      repo,
      pullNumber: issue.number,
      actor: sender.login,
      actorId: sender.id,
      reason,
      method: 'comment',
    });
  }

  private async handleCheckRun(payload: any) {
    const { action, check_run, repository, installation } = payload;

    if (action === 'rerequested' && check_run.pull_requests && check_run.pull_requests.length > 0) {
      const pr = check_run.pull_requests[0];
      const repoRecord = await prisma.repository.findFirst({
        where: { fullName: repository.full_name },
      });

      if (!repoRecord || !installation?.id) return { status: 'skipped' };

      await this.reviewService.enqueueReview({
        installationId: installation.id,
        repositoryId: repoRecord.id,
        repoFullName: repository.full_name,
        pullNumber: pr.number,
        headSha: pr.head.sha,
        action: 'rerequested',
        prTitle: `PR #${pr.number}`,
        prAuthor: 'unknown',
        baseBranch: pr.base.ref,
        headBranch: pr.head.ref,
      });

      return { status: 're_enqueued', pr: pr.number };
    }

    return { status: 'ignored' };
  }

  private async handleMarketplacePurchase(payload: any) {
    const { action, marketplace_purchase } = payload;
    const account = marketplace_purchase.account;
    const plan = marketplace_purchase.plan;

    const dbInst = await prisma.installation.findFirst({
      where: { accountLogin: account.login },
    });

    if (!dbInst) return { status: 'installation_not_found' };

    let planTier = 'free';
    if (plan.name.toLowerCase().includes('pro')) planTier = 'pro';
    if (plan.name.toLowerCase().includes('team')) planTier = 'team';

    await prisma.marketplacePlan.upsert({
      where: { installationId: dbInst.id },
      update: {
        githubPlanId: plan.id,
        planName: plan.name,
        planTier,
        status: action === 'cancelled' ? 'CANCELLED' : 'ACTIVE',
        billingCycle: marketplace_purchase.billing_cycle || 'monthly',
        unitCount: marketplace_purchase.unit_count || 1,
        monthlyPriceCents: plan.monthly_price_in_cents || 0,
        yearlyPriceCents: plan.yearly_price_in_cents || 0,
      },
      create: {
        installationId: dbInst.id,
        githubPlanId: plan.id,
        planName: plan.name,
        planTier,
        status: action === 'cancelled' ? 'CANCELLED' : 'ACTIVE',
        billingCycle: marketplace_purchase.billing_cycle || 'monthly',
        unitCount: marketplace_purchase.unit_count || 1,
        monthlyPriceCents: plan.monthly_price_in_cents || 0,
        yearlyPriceCents: plan.yearly_price_in_cents || 0,
      },
    });

    return { status: 'marketplace_synced', plan: plan.name };
  }
}
