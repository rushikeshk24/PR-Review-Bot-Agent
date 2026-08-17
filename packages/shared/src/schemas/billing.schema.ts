import { z } from 'zod';

// ─── Billing Plan Tiers ───

export const PlanTier = z.enum(['free', 'pro', 'team']);
export type PlanTier = z.infer<typeof PlanTier>;

export const BillingPlanSchema = z.object({
  tier: PlanTier,
  name: z.string(),
  monthlyPriceCents: z.number().int(),
  yearlyPriceCents: z.number().int(),
  reviewsPerMonth: z.number().int().describe('Max reviews per month, -1 for unlimited'),
  maxReposPerInstallation: z.number().int().describe('Max repos, -1 for unlimited'),
  features: z.array(z.string()),
  modelTier: z.enum(['flash', 'pro']),
});

export type BillingPlan = z.infer<typeof BillingPlanSchema>;

// ─── Default Plan Definitions ───

export const PLANS: Record<PlanTier, BillingPlan> = {
  free: {
    tier: 'free',
    name: 'Free',
    monthlyPriceCents: 0,
    yearlyPriceCents: 0,
    reviewsPerMonth: 50,
    maxReposPerInstallation: 3,
    features: [
      'AI-powered code review',
      'Inline PR comments',
      'Advisory mode only',
      'Community support',
    ],
    modelTier: 'flash',
  },
  pro: {
    tier: 'pro',
    name: 'Pro',
    monthlyPriceCents: 2900,
    yearlyPriceCents: 29000,
    reviewsPerMonth: -1,
    maxReposPerInstallation: -1,
    features: [
      'Unlimited AI reviews',
      'Strict blocking mode',
      'Check Run integration',
      'Override commands',
      'Custom review prompts',
      'Priority queue',
      'Email support',
    ],
    modelTier: 'pro',
  },
  team: {
    tier: 'team',
    name: 'Team',
    monthlyPriceCents: 1900,
    yearlyPriceCents: 19000,
    reviewsPerMonth: -1,
    maxReposPerInstallation: -1,
    features: [
      'Everything in Pro',
      'Per-seat billing',
      'Org-wide settings',
      'Override audit log',
      'Admin dashboard',
      'Priority support',
      'Custom severity rules',
    ],
    modelTier: 'pro',
  },
};

// ─── Usage Tracking ───

export const UsageRecordSchema = z.object({
  installationId: z.string(),
  period: z.string().describe('YYYY-MM format'),
  reviewCount: z.number().int(),
  tokensUsed: z.number().int(),
  estimatedCostCents: z.number().int(),
});

export type UsageRecord = z.infer<typeof UsageRecordSchema>;
