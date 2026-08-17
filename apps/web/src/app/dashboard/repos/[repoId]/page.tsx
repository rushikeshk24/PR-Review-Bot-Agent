import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GitPullRequest, Settings, ArrowLeft, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function RepoDetailPage({ params }: { params: { repoId: string } }) {
  let repo: any = null;

  try {
    repo = await api.getRepository(params.repoId);
  } catch {
    notFound();
  }

  if (!repo) notFound();

  const reviews = repo.reviews || [];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Back Link */}
      <div>
        <Link
          href="/dashboard/repos"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            color: 'var(--text-muted)',
            fontSize: '0.85rem',
            marginBottom: '0.5rem',
          }}
        >
          <ArrowLeft size={14} /> Back to Repositories
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>{repo.fullName}</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Installation: <strong>{repo.installation?.accountLogin}</strong> • Default branch: <code>{repo.defaultBranch}</code>
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link
              href={`https://github.com/${repo.fullName}`}
              target="_blank"
              className="btn btn-secondary"
            >
              GitHub <ExternalLink size={14} />
            </Link>
            <Link
              href={`/dashboard/repos/${repo.id}/settings`}
              className="btn btn-primary"
            >
              <Settings size={14} /> Configure Rules
            </Link>
          </div>
        </div>
      </div>

      {/* Pull Requests & Merge Status Section */}
      {repo.pullRequests && repo.pullRequests.length > 0 && (
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            Pull Requests ({repo.pullRequests.length})
          </h2>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>PR #</th>
                  <th>Title</th>
                  <th>Author</th>
                  <th>Merge Status</th>
                  <th>Blocking Issues</th>
                  <th>Iterations</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {repo.pullRequests.map((prItem: any) => (
                  <tr key={prItem.id}>
                    <td>
                      <strong style={{ color: 'var(--accent-primary)' }}>#{prItem.pullNumber}</strong>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{prItem.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <code>{prItem.baseBranch} ← {prItem.headBranch}</code>
                      </div>
                    </td>
                    <td>{prItem.author}</td>
                    <td>
                      {prItem.isBlocked ? (
                        <span style={{
                          padding: '0.2rem 0.55rem',
                          borderRadius: '999px',
                          backgroundColor: 'rgba(239,68,68,0.15)',
                          color: '#ef4444',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          display: 'inline-block',
                        }}>
                          ❌ BLOCKED
                        </span>
                      ) : (
                        <span style={{
                          padding: '0.2rem 0.55rem',
                          borderRadius: '999px',
                          backgroundColor: 'rgba(34,197,94,0.15)',
                          color: '#22c55e',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          display: 'inline-block',
                        }}>
                          ✅ MERGEABLE
                        </span>
                      )}
                    </td>
                    <td>
                      {prItem.blockingIssueCount > 0 ? (
                        <span style={{ color: '#ef4444', fontWeight: 700 }}>
                          {prItem.blockingIssueCount} blocking
                        </span>
                      ) : (
                        <span style={{ color: '#22c55e', fontWeight: 600 }}>0 blocking</span>
                      )}
                    </td>
                    <td>
                      <Badge variant="neutral">Iteration #{prItem.currentIteration}</Badge>
                    </td>
                    <td>
                      <Link
                        href={`/dashboard/repos/${repo.id}/pulls/${prItem.pullNumber}`}
                        className="btn btn-primary"
                        style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                      >
                        PR Details →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reviews Table */}
      <div>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.75rem' }}>
          Review Iterations History ({reviews.length})
        </h2>

        {reviews.length === 0 ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
              <GitPullRequest size={36} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>No PRs Reviewed Yet</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                When you open a Pull Request on <code>{repo.fullName}</code>, the review bot will automatically analyze changes and show findings here.
              </p>
            </div>
          </Card>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Pull Request</th>
                  <th>Iteration</th>
                  <th>Commit</th>
                  <th>Status</th>
                  <th>Conclusion</th>
                  <th>Score</th>
                  <th>Blocking Issues</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((rev: any) => {
                  return (
                    <tr key={rev.id}>
                      <td>
                        <strong>PR #{rev.pullNumber}</strong>
                      </td>
                      <td>
                        <Badge variant="neutral">Iter #{rev.iterationNumber || 1}</Badge>
                      </td>
                      <td>
                        <code>{rev.commitSha.substring(0, 7)}</code>
                      </td>
                      <td>
                        <Badge
                          variant={
                            rev.status === 'COMPLETED'
                              ? 'success'
                              : rev.status === 'IN_PROGRESS'
                                ? 'info'
                                : 'danger'
                          }
                        >
                          {rev.status}
                        </Badge>
                      </td>
                      <td>
                        <Badge
                          variant={
                            rev.checkConclusion === 'success'
                              ? 'success'
                              : rev.checkConclusion === 'failure'
                                ? 'danger'
                                : 'neutral'
                          }
                        >
                          {rev.checkConclusion || 'pending'}
                        </Badge>
                      </td>
                      <td>
                        {rev.overallScore !== null ? (
                          <strong
                            style={{
                              color:
                                rev.overallScore >= 80
                                  ? 'var(--status-success)'
                                  : rev.overallScore >= 60
                                    ? 'var(--status-warning)'
                                    : 'var(--status-danger)',
                            }}
                          >
                            {rev.overallScore}/100
                          </strong>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        {rev.blockingIssueCount > 0 ? (
                          <span style={{ color: 'var(--status-danger)', fontWeight: 600 }}>
                            {rev.blockingIssueCount} issue(s)
                          </span>
                        ) : (
                          <span style={{ color: 'var(--status-success)' }}>None</span>
                        )}
                      </td>
                      <td>{new Date(rev.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <Link
                            href={`/dashboard/repos/${repo.id}/pulls/${rev.pullNumber}`}
                            className="btn btn-primary"
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                          >
                            PR Timeline
                          </Link>
                          <Link
                            href={`/dashboard/reviews/${rev.id}`}
                            className="btn btn-secondary"
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                          >
                            Raw Report
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
    </div>
  );
}
