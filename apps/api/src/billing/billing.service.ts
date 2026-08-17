import { Injectable } from '@nestjs/common';
import { prisma } from '@codelens/database';
import { PLANS, PlanTier } from '@codelens/shared';

@Injectable()
export class BillingService {
  async getPlans() {
    return Object.values(PLANS);
  }

  async getInstallationBilling(installationId: string) {
    const installation = await prisma.installation.findUnique({
      where: { id: installationId },
      include: { marketplacePlan: true },
    });

    const currentPlanTier = (installation?.marketplacePlan?.planTier || 'free') as PlanTier;
    const planDetails = PLANS[currentPlanTier] || PLANS.free;

    // Get current month usage
    const currentMonth = new Date().toISOString().substring(0, 7);
    const usage = await prisma.usageRecord.findUnique({
      where: {
        installationId_period: {
          installationId,
          period: currentMonth,
        },
      },
    });

    return {
      plan: planDetails,
      subscription: installation?.marketplacePlan,
      usage: {
        period: currentMonth,
        reviewsUsed: usage?.reviewCount || 0,
        reviewsLimit: planDetails.reviewsPerMonth,
        tokensUsed: usage?.tokensUsed || 0,
      },
    };
  }
}
