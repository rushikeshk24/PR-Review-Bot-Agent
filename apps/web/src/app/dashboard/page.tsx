import React from 'react';
import Link from 'next/link';
import {
  GitPullRequest,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ExternalLink,
  Settings,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function DashboardOverviewPage() {
  let installations: any[] = [];
  let overrides: any[] = [];

  try {
    installations = await api.getInstallations();
  } catch (err) {
    // API server might be offline during SSR build
  }

  try {
    overrides = await api.getOverrides(5);
  } catch (err) {}

  const allRepos = installations.flatMap((inst) => inst.repositories || []);
  const totalReviewsCount = allRepos.reduce((acc, r) => acc + (r._count?.reviews || 0), 0);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Page Title */}
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
          System Overview
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Real-time metrics, active repository status, and recent code review findings.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Connected Repos</span>
            <GitPullRequest size={18} color="var(--accent-primary)" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{allRepos.length}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--status-success)' }}>
            Across {installations.length} installation(s)
          </span>
        </Card>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Total PRs Analyzed</span>
            <CheckCircle2 size={18} color="var(--status-success)" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{totalReviewsCount}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>All-time total</span>
        </Card>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Manual Overrides</span>
            <ShieldAlert size={18} color="var(--status-warning)" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{overrides.length}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Audited exceptions</span>
        </Card>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>AI Review Engine</span>
            <span className="badge badge-success">Active</span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>Gemini 2.0</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Structured JSON mode</span>
        </Card>
      </div>

      {/* Repositories Section */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Active Repositories</h2>
          <Link href="/dashboard/repos" className="btn btn-secondary" style={{ fontSize: '0.8125rem' }}>
            View All
          </Link>
        </div>

        {allRepos.length === 0 ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <GitPullRequest size={36} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>No Repositories Installed Yet</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Connect your own GitHub App and repositories to start automatic PR reviews.
              </p>
              <Link href="/dashboard/repos" className="btn btn-primary">
                Connect GitHub App <ExternalLink size={14} />
              </Link>
            </div>
          </Card>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Repository</th>
                  <th>Mode</th>
                  <th>Severity Threshold</th>
                  <th>Total Reviews</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {allRepos.map((repo) => {
                  const mode = repo.settings?.blockingMode || 'ADVISORY';
                  const threshold = repo.settings?.severityThreshold || 'ERROR';

                  return (
                    <tr key={repo.id}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <strong style={{ fontSize: '0.9rem' }}>{repo.fullName}</strong>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Branch: {repo.defaultBranch}
                          </span>
                        </div>
                      </td>
                      <td>
                        <Badge variant={mode === 'STRICT' ? 'danger' : 'info'}>
                          {mode}
                        </Badge>
                      </td>
                      <td>
                        <Badge variant={threshold === 'CRITICAL' || threshold === 'ERROR' ? 'warning' : 'neutral'}>
                          {threshold}
                        </Badge>
                      </td>
                      <td>{repo._count?.reviews || 0}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <Link
                            href={`/dashboard/repos/${repo.id}`}
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                          >
                            History
                          </Link>
                          <Link
                            href={`/dashboard/repos/${repo.id}/settings`}
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                          >
                            <Settings size={13} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Overrides Audit Section */}
      {overrides.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Recent Manual Overrides</h2>
            <Link href="/dashboard/overrides" className="btn btn-secondary" style={{ fontSize: '0.8125rem' }}>
              Full Audit Log
            </Link>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Actor</th>
                  <th>Repository</th>
                  <th>PR #</th>
                  <th>Reason</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {overrides.map((override) => (
                  <tr key={override.id}>
                    <td>
                      <strong>@{override.actor}</strong>
                    </td>
                    <td>{override.prReview?.repository?.fullName || '—'}</td>
                    <td>#{override.prReview?.pullNumber || '—'}</td>
                    <td>
                      <span style={{ fontStyle: override.reason ? 'normal' : 'italic', color: override.reason ? 'inherit' : 'var(--text-muted)' }}>
                        {override.reason || 'No reason provided'}
                      </span>
                    </td>
                    <td>{new Date(override.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
