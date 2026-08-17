const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function fetcher<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error [${response.status}] ${endpoint}: ${errorText}`);
  }

  return response.json();
}

export const api = {
  // Installations
  getInstallations: () => fetcher<any[]>('/installations'),
  getInstallation: (id: string) => fetcher<any>(`/installations/${id}`),
  getRepository: (repoId: string) => fetcher<any>(`/installations/repos/${repoId}`),

  // Reviews
  getReview: (id: string) => fetcher<any>(`/reviews/${id}`),
  getOverrides: (limit = 50) => fetcher<any[]>(`/reviews/overrides?limit=${limit}`),

  // Settings
  getRepoSettings: (repoId: string) => fetcher<any>(`/settings/repos/${repoId}`),
  updateRepoSettings: (repoId: string, data: any) =>
    fetcher<any>(`/settings/repos/${repoId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Billing
  getBillingPlans: () => fetcher<any[]>('/billing/plans'),
  getInstallationBilling: (id: string) => fetcher<any>(`/billing/installation/${id}`),
  // Manual repo review (paste any public GitHub URL)
  getRepoPRs: (repoUrl: string) =>
    fetcher<{ repo: any; prs: any[] }>('/manual/repo', {
      method: 'POST',
      body: JSON.stringify({ repoUrl }),
    }),
  triggerManualReview: (data: {
    owner: string;
    repo: string;
    pullNumber: number;
    headSha: string;
    baseSha: string;
    prTitle: string;
    prAuthor: string;
    baseBranch: string;
    headBranch: string;
  }) =>
    fetcher<{ status: string; jobId: string }>('/manual/review', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  auditCodebase: (repoUrl: string) =>
    fetcher<any>('/manual/codebase-audit', {
      method: 'POST',
      body: JSON.stringify({ repoUrl }),
    }),
  // Pull Requests & Iterations
  getPullRequest: (repoId: string, pullNumber: number) =>
    fetcher<any>(`/reviews/pr/${repoId}/${pullNumber}`),
  getRepoPullRequests: (repoId: string) =>
    fetcher<any[]>(`/reviews/repo/${repoId}/prs`),
  overrideReview: (data: {
    installationId: number;
    owner: string;
    repo: string;
    pullNumber: number;
    actor: string;
    reason?: string;
  }) =>
    fetcher<any>('/reviews/override', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
