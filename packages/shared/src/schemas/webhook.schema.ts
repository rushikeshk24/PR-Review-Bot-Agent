import { z } from 'zod';

// ─── GitHub Webhook Common Fields ───

export const WebhookSenderSchema = z.object({
  login: z.string(),
  id: z.number(),
  avatar_url: z.string().optional(),
});

export const WebhookRepositorySchema = z.object({
  id: z.number(),
  name: z.string(),
  full_name: z.string(),
  private: z.boolean(),
  default_branch: z.string().optional(),
  owner: z.object({
    login: z.string(),
    id: z.number(),
    avatar_url: z.string().optional(),
  }),
});

export const WebhookInstallationSchema = z.object({
  id: z.number(),
  account: z.object({
    login: z.string(),
    id: z.number(),
    avatar_url: z.string().optional(),
    type: z.enum(['User', 'Organization']),
  }),
});

// ─── Pull Request Webhook ───

export const PullRequestWebhookSchema = z.object({
  action: z.enum([
    'opened', 'synchronize', 'reopened', 'closed',
    'edited', 'ready_for_review', 'converted_to_draft',
  ]),
  number: z.number().int(),
  pull_request: z.object({
    number: z.number().int(),
    title: z.string(),
    body: z.string().nullable().optional(),
    state: z.enum(['open', 'closed']),
    draft: z.boolean().optional(),
    head: z.object({
      sha: z.string(),
      ref: z.string(),
      repo: z.object({ full_name: z.string() }).optional(),
    }),
    base: z.object({
      sha: z.string(),
      ref: z.string(),
      repo: z.object({ full_name: z.string() }).optional(),
    }),
    user: z.object({
      login: z.string(),
      id: z.number(),
    }),
    changed_files: z.number().int().optional(),
    additions: z.number().int().optional(),
    deletions: z.number().int().optional(),
  }),
  repository: WebhookRepositorySchema,
  installation: WebhookInstallationSchema.optional(),
  sender: WebhookSenderSchema,
});

export type PullRequestWebhook = z.infer<typeof PullRequestWebhookSchema>;

// ─── Installation Webhook ───

export const InstallationWebhookSchema = z.object({
  action: z.enum(['created', 'deleted', 'suspend', 'unsuspend', 'new_permissions_accepted']),
  installation: z.object({
    id: z.number(),
    account: z.object({
      login: z.string(),
      id: z.number(),
      avatar_url: z.string().optional(),
      type: z.enum(['User', 'Organization']),
    }),
    permissions: z.record(z.string()).optional(),
    events: z.array(z.string()).optional(),
    repository_selection: z.enum(['all', 'selected']).optional(),
  }),
  repositories: z.array(z.object({
    id: z.number(),
    name: z.string(),
    full_name: z.string(),
    private: z.boolean(),
  })).optional(),
  sender: WebhookSenderSchema,
});

export type InstallationWebhook = z.infer<typeof InstallationWebhookSchema>;

// ─── Installation Repositories Webhook ───

export const InstallationRepositoriesWebhookSchema = z.object({
  action: z.enum(['added', 'removed']),
  installation: z.object({
    id: z.number(),
    account: z.object({
      login: z.string(),
      id: z.number(),
      type: z.enum(['User', 'Organization']),
    }),
  }),
  repositories_added: z.array(z.object({
    id: z.number(),
    name: z.string(),
    full_name: z.string(),
    private: z.boolean(),
  })).optional(),
  repositories_removed: z.array(z.object({
    id: z.number(),
    name: z.string(),
    full_name: z.string(),
    private: z.boolean(),
  })).optional(),
  sender: WebhookSenderSchema,
});

export type InstallationRepositoriesWebhook = z.infer<typeof InstallationRepositoriesWebhookSchema>;

// ─── Issue Comment Webhook (for override commands) ───

export const IssueCommentWebhookSchema = z.object({
  action: z.enum(['created', 'edited', 'deleted']),
  issue: z.object({
    number: z.number().int(),
    pull_request: z.object({
      url: z.string(),
    }).optional(),
  }),
  comment: z.object({
    id: z.number(),
    body: z.string(),
    user: z.object({
      login: z.string(),
      id: z.number(),
    }),
    created_at: z.string(),
  }),
  repository: WebhookRepositorySchema,
  installation: WebhookInstallationSchema.optional(),
  sender: WebhookSenderSchema,
});

export type IssueCommentWebhook = z.infer<typeof IssueCommentWebhookSchema>;

// ─── Check Run Webhook ───

export const CheckRunWebhookSchema = z.object({
  action: z.enum(['created', 'completed', 'rerequested', 'requested_action']),
  check_run: z.object({
    id: z.number(),
    name: z.string(),
    head_sha: z.string(),
    status: z.enum(['queued', 'in_progress', 'completed']),
    conclusion: z.string().nullable().optional(),
    pull_requests: z.array(z.object({
      number: z.number().int(),
      head: z.object({ sha: z.string(), ref: z.string() }),
      base: z.object({ sha: z.string(), ref: z.string() }),
    })),
  }),
  repository: WebhookRepositorySchema,
  installation: WebhookInstallationSchema.optional(),
  sender: WebhookSenderSchema,
});

export type CheckRunWebhook = z.infer<typeof CheckRunWebhookSchema>;

// ─── Marketplace Purchase Webhook ───

export const MarketplacePurchaseWebhookSchema = z.object({
  action: z.enum([
    'purchased', 'cancelled', 'changed',
    'pending_change', 'pending_change_cancelled',
  ]),
  effective_date: z.string().optional(),
  marketplace_purchase: z.object({
    account: z.object({
      type: z.enum(['User', 'Organization']),
      id: z.number(),
      login: z.string(),
      organization_billing_email: z.string().nullable().optional(),
    }),
    billing_cycle: z.enum(['monthly', 'yearly']).optional(),
    unit_count: z.number().int().optional(),
    on_free_trial: z.boolean().optional(),
    free_trial_ends_on: z.string().nullable().optional(),
    next_billing_date: z.string().nullable().optional(),
    plan: z.object({
      id: z.number(),
      name: z.string(),
      description: z.string().optional(),
      monthly_price_in_cents: z.number().int(),
      yearly_price_in_cents: z.number().int(),
      price_model: z.enum(['free', 'flat_rate', 'per_unit']),
      unit_name: z.string().nullable().optional(),
      bullets: z.array(z.string()).optional(),
    }),
  }),
  previous_marketplace_purchase: z.object({
    plan: z.object({
      id: z.number(),
      name: z.string(),
    }),
  }).optional(),
  sender: WebhookSenderSchema,
});

export type MarketplacePurchaseWebhook = z.infer<typeof MarketplacePurchaseWebhookSchema>;
