import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  ShieldCheck,
  Code2,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function ReviewDetailPage({ params }: { params: { reviewId: string } }) {
  let review: any = null;

  try {
    review = await api.getReview(params.reviewId);
  } catch {
    notFound();
  }

  if (!review) notFound();

  const findings = (review.findings as any[]) || [];
  const overrides = review.overrides || [];

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header / Nav */}
      <div>
        <Link
          href={`/dashboard/repos/${review.repositoryId}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            color: 'var(--text-muted)',
            fontSize: '0.85rem',
            marginBottom: '0.5rem',
          }}
        >
          <ArrowLeft size={14} /> Back to Repository History
        </Link>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>PR #{review.pullNumber} Review</h1>
              <Badge
                variant={
                  review.checkConclusion === 'success'
                    ? 'success'
                    : review.checkConclusion === 'failure'
                      ? 'danger'
                      : 'neutral'
                }
              >
                {review.checkConclusion ? review.checkConclusion.toUpperCase() : 'PENDING'}
              </Badge>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Repository: <strong>{review.repository?.fullName}</strong> • Commit:{' '}
              <code>{review.commitSha?.substring(0, 7)}</code> • Reviewed on{' '}
              {new Date(review.createdAt).toLocaleString()}
            </p>
          </div>

          <Link
            href={`https://github.com/${review.repository?.fullName}/pull/${review.pullNumber}`}
            target="_blank"
            className="btn btn-secondary"
          >
            Open PR on GitHub <ExternalLink size={14} />
          </Link>
        </div>
      </div>

      {/* Override Notice Banner if present */}
      {overrides.length > 0 && (
        <div
          style={{
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid var(--status-warning)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <ShieldCheck size={20} color="var(--status-warning)" />
          <div style={{ fontSize: '0.875rem' }}>
            <strong>Manual Override Applied:</strong> Overridden by @{overrides[0].actor} via {overrides[0].method} (Reason: <em>{overrides[0].reason || 'None specified'}</em>) on {new Date(overrides[0].createdAt).toLocaleString()}.
          </div>
        </div>
      )}

      {/* Score and Summary Card */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Code Quality Score</span>
            <div
              style={{
                fontSize: '2.5rem',
                fontWeight: 800,
                color:
                  review.overallScore >= 80
                    ? 'var(--status-success)'
                    : review.overallScore >= 60
                      ? 'var(--status-warning)'
                      : 'var(--status-danger)',
              }}
            >
              {review.overallScore !== null ? `${review.overallScore}/100` : '—'}
            </div>
          </div>

          <div style={{ textAlign: 'right', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            <div>Model: <strong>{review.modelUsed || 'gemini-2.0-flash'}</strong></div>
            <div>Duration: <strong>{review.durationMs ? `${(review.durationMs / 1000).toFixed(1)}s` : '—'}</strong></div>
            <div>Blocking issues: <strong style={{ color: review.blockingIssueCount > 0 ? 'var(--status-danger)' : 'var(--status-success)' }}>{review.blockingIssueCount}</strong></div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem' }}>AI Executive Summary</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {review.summary || 'No review summary generated.'}
          </p>
        </div>
      </Card>

      {/* Findings Section */}
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem' }}>
          Code Findings ({findings.length})
        </h2>

        {findings.length === 0 ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <CheckCircle2 size={36} color="var(--status-success)" style={{ margin: '0 auto 0.75rem' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>Clean Review — No Issues Found</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Gemini analyzed all eligible modified files and found no bugs, security risks, or contract violations.
              </p>
            </div>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {findings.map((finding: any, idx: number) => {
              const sev = finding.severity;
              const badgeVariant =
                sev === 'CRITICAL' || sev === 'ERROR'
                  ? 'danger'
                  : sev === 'WARNING'
                    ? 'warning'
                    : 'info';

              return (
                <Card key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Badge variant={badgeVariant}>{finding.severity}</Badge>
                      <span className="badge badge-neutral">{finding.category || 'general'}</span>
                      <strong style={{ fontSize: '0.95rem' }}>{finding.title}</strong>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {finding.file}:{finding.line}
                      {finding.endLine && finding.endLine !== finding.line ? `-${finding.endLine}` : ''}
                    </div>
                  </div>

                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                    {finding.description}
                  </p>

                  {finding.suggestedFix && (
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Suggested Fix:
                      </span>
                      <pre className="code-box" style={{ marginTop: '0.35rem' }}>
                        <code>{finding.suggestedFix}</code>
                      </pre>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
