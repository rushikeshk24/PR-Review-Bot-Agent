'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  GitPullRequest,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Shield,
  Zap,
  Code2,
  Star,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  ExternalLink,
  Lock,
  Unlock,
  Clock,
  ArrowLeft,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  CRITICAL: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', icon: XCircle, label: 'Critical' },
  ERROR: { color: '#f97316', bg: 'rgba(249,115,22,0.1)', icon: XCircle, label: 'Error' },
  WARNING: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: AlertTriangle, label: 'Warning' },
  INFO: { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', icon: Info, label: 'Info' },
};

export default function PullRequestDetailPage() {
  const params = useParams();
  const repoId = params.repoId as string;
  const pullNumber = parseInt(params.pullNumber as string, 10);

  const [pr, setPr] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedIteration, setSelectedIteration] = useState<number | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'BLOCKING' | 'RESOLVED'>('ALL');
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideActor, setOverrideActor] = useState('aakashyadav27');
  const [overriding, setOverriding] = useState(false);

  const loadPR = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getPullRequest(repoId, pullNumber);
      setPr(data);
      if (data?.reviews?.length > 0) {
        setSelectedIteration(data.reviews[0].iterationNumber);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load pull request details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (repoId && pullNumber) {
      loadPR();
    }
  }, [repoId, pullNumber]);

  const handleOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pr || overriding) return;
    setOverriding(true);
    try {
      const [owner, repo] = pr.repository.fullName.split('/');
      await api.overrideReview({
        installationId: pr.repository.installation ? Number(pr.repository.installation.githubInstallationId) : 0,
        owner,
        repo,
        pullNumber: pr.pullNumber,
        actor: overrideActor.trim() || 'developer',
        reason: overrideReason.trim() || 'Manual administrative override approved in dashboard',
      });
      setShowOverrideModal(false);
      setOverrideReason('');
      await loadPR();
    } catch (err: any) {
      alert(err.message || 'Failed to apply override.');
    } finally {
      setOverriding(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '1rem' }}>
        <Loader2 size={32} className="spin" color="var(--accent-primary)" />
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading Pull Request #{pullNumber}...</p>
      </div>
    );
  }

  if (error || !pr) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <Link href={`/dashboard/repos`} className="btn btn-secondary" style={{ marginBottom: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <ArrowLeft size={14} /> Back to Repositories
        </Link>
        <Card style={{ padding: '2rem', textAlign: 'center' }}>
          <XCircle size={36} color="var(--status-danger, #ef4444)" style={{ margin: '0 auto 0.75rem' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Failed to Load PR</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>{error || 'Pull Request not found.'}</p>
          <button onClick={loadPR} className="btn btn-primary">Try Again</button>
        </Card>
      </div>
    );
  }

  const reviews: any[] = pr.reviews || [];
  const findings: any[] = pr.findings || [];
  const currentReview = reviews.find((r) => r.iterationNumber === selectedIteration) || reviews[0];

  const filteredFindings = findings.filter((f) => {
    if (filter === 'BLOCKING') return f.status === 'OPEN' && f.blocking;
    if (filter === 'RESOLVED') return f.status === 'RESOLVED';
    return true;
  });

  const openBlockingCount = findings.filter((f) => f.status === 'OPEN' && f.blocking).length;
  const totalResolvedCount = findings.filter((f) => f.status === 'RESOLVED').length;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Breadcrumb & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <Link href="/dashboard/repos" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
            Repositories
          </Link>
          <span>/</span>
          <span style={{ color: 'var(--text-secondary)' }}>{pr.repository.fullName}</span>
          <span>/</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>PR #{pr.pullNumber}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button onClick={loadPR} className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
            <RefreshCw size={13} /> Refresh
          </button>
          <a
            href={`https://github.com/${pr.repository.fullName}/pull/${pr.pullNumber}`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}
          >
            Open on GitHub <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* PR Header Card */}
      <Card style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '280px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '1.15rem' }}>
                #{pr.pullNumber}
              </span>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{pr.title}</h1>
              <Badge variant={pr.state === 'OPEN' ? 'success' : 'neutral'}>{pr.state}</Badge>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
              <span>Author: <strong style={{ color: 'var(--text-primary)' }}>{pr.author}</strong></span>
              <span>Branch: <code style={{ color: 'var(--text-primary)' }}>{pr.baseBranch} ← {pr.headBranch}</code></span>
              <span>Latest Commit: <code style={{ color: 'var(--text-primary)' }}>{pr.headSha?.slice(0, 7)}</code></span>
              <span>Iterations: <strong style={{ color: 'var(--text-primary)' }}>{reviews.length}</strong></span>
            </div>
          </div>

          {/* Big Merge Status Box */}
          <div style={{
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-sm)',
            border: `2px solid ${pr.isBlocked ? '#ef4444' : '#22c55e'}`,
            backgroundColor: pr.isBlocked ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
          }}>
            {pr.isBlocked ? <XCircle size={24} color="#ef4444" /> : <CheckCircle size={24} color="#22c55e" />}
            <div>
              <p style={{ fontSize: '0.95rem', fontWeight: 700, color: pr.isBlocked ? '#ef4444' : '#22c55e', margin: 0 }}>
                {pr.isBlocked ? 'Merge Blocked' : 'Merge Allowed'}
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                {pr.isBlocked
                  ? `${openBlockingCount} blocking issue(s) unresolved`
                  : 'All checks passed — ready to merge'}
              </p>
            </div>
            {pr.isBlocked && (
              <button
                onClick={() => setShowOverrideModal(true)}
                className="btn btn-secondary"
                style={{ marginLeft: '0.5rem', fontSize: '0.75rem', padding: '0.35rem 0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Unlock size={12} /> Override
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Review Iterations Timeline */}
      {reviews.length > 0 && (
        <Card style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Clock size={16} /> Review Iterations Across Commits ({reviews.length})
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              A new review is automatically triggered on every push (synchronize)
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
            {reviews.map((rev) => {
              const active = rev.iterationNumber === selectedIteration;
              const isFailed = rev.checkConclusion === 'failure';
              return (
                <button
                  key={rev.id}
                  onClick={() => setSelectedIteration(rev.iterationNumber)}
                  style={{
                    padding: '0.65rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    border: `1px solid ${active ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                    background: active ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '0.25rem',
                    minWidth: '150px',
                    textAlign: 'left',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: active ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                      Iteration #{rev.iterationNumber}
                    </span>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: isFailed ? '#ef4444' : '#22c55e',
                    }}>
                      {rev.overallScore ?? '--'}/100
                    </span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    SHA: {rev.commitSha?.slice(0, 7)}
                  </span>
                  {rev.resolvedDeltaCount > 0 && (
                    <span style={{ fontSize: '0.68rem', color: '#22c55e', fontWeight: 600 }}>
                      ✓ {rev.resolvedDeltaCount} issue(s) resolved
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {currentReview && (
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  Iteration #{currentReview.iterationNumber} Summary
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Duration: {((currentReview.durationMs || 0) / 1000).toFixed(1)}s · Model: {currentReview.modelUsed || 'Gemini'}
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                {currentReview.summary || 'No review summary available.'}
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Persistent Findings Issue Tracker */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              Issue Lifecycle Tracker ({findings.length})
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Tracks whether each issue is OPEN, BLOCKING, or has been RESOLVED in subsequent commits.
            </p>
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <button
              onClick={() => setFilter('ALL')}
              className="btn btn-secondary"
              style={{
                fontSize: '0.75rem',
                padding: '0.3rem 0.65rem',
                background: filter === 'ALL' ? 'var(--bg-tertiary)' : 'transparent',
                fontWeight: filter === 'ALL' ? 700 : 500,
              }}
            >
              All ({findings.length})
            </button>
            <button
              onClick={() => setFilter('BLOCKING')}
              className="btn btn-secondary"
              style={{
                fontSize: '0.75rem',
                padding: '0.3rem 0.65rem',
                color: openBlockingCount > 0 ? '#ef4444' : 'inherit',
                background: filter === 'BLOCKING' ? 'var(--bg-tertiary)' : 'transparent',
                fontWeight: filter === 'BLOCKING' ? 700 : 500,
              }}
            >
              ❌ Blocking ({openBlockingCount})
            </button>
            <button
              onClick={() => setFilter('RESOLVED')}
              className="btn btn-secondary"
              style={{
                fontSize: '0.75rem',
                padding: '0.3rem 0.65rem',
                color: totalResolvedCount > 0 ? '#22c55e' : 'inherit',
                background: filter === 'RESOLVED' ? 'var(--bg-tertiary)' : 'transparent',
                fontWeight: filter === 'RESOLVED' ? 700 : 500,
              }}
            >
              ✅ Resolved ({totalResolvedCount})
            </button>
          </div>
        </div>

        {filteredFindings.length === 0 ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
              <CheckCircle size={36} color="var(--status-success)" style={{ margin: '0 auto 0.75rem' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.35rem' }}>No Issues Found</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {filter === 'BLOCKING' ? 'No open blocking issues preventing merge!' : 'No findings match the selected filter.'}
              </p>
            </div>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {filteredFindings.map((f) => {
              const sev = SEVERITY_CONFIG[f.severity] || SEVERITY_CONFIG.INFO;
              const SevIcon = sev.icon;
              const isResolved = f.status === 'RESOLVED';
              return (
                <Card key={f.id} style={{ padding: '1rem 1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flex: 1 }}>
                      {isResolved ? (
                        <CheckCircle size={18} color="#22c55e" style={{ marginTop: '2px', flexShrink: 0 }} />
                      ) : (
                        <SevIcon size={18} color={sev.color} style={{ marginTop: '2px', flexShrink: 0 }} />
                      )}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                            {f.filePath}:{f.line}
                          </span>
                          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {f.title}
                          </span>
                          <span style={{
                            fontSize: '0.7rem',
                            padding: '0.1rem 0.45rem',
                            borderRadius: '999px',
                            backgroundColor: sev.bg,
                            color: sev.color,
                            fontWeight: 600,
                          }}>
                            {f.severity}
                          </span>
                          {f.blocking && !isResolved && (
                            <span style={{
                              fontSize: '0.68rem',
                              padding: '0.1rem 0.45rem',
                              borderRadius: '999px',
                              backgroundColor: 'rgba(239,68,68,0.15)',
                              color: '#ef4444',
                              fontWeight: 700,
                            }}>
                              BLOCKING
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '0.5rem' }}>
                          {f.description}
                        </p>
                        {f.suggestedFix && (
                          <div style={{ marginTop: '0.5rem' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.25rem' }}>
                              <Lightbulb size={11} /> Suggested Fix:
                            </span>
                            <pre style={{
                              fontSize: '0.75rem',
                              background: 'var(--bg-primary)',
                              padding: '0.6rem 0.8rem',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--border-subtle)',
                              overflowX: 'auto',
                              color: 'var(--text-primary)',
                            }}>{f.suggestedFix}</pre>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status Badge on right */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      {isResolved ? (
                        <div style={{
                          padding: '0.35rem 0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'rgba(34,197,94,0.1)',
                          border: '1px solid #22c55e',
                          color: '#22c55e',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}>
                          ✓ RESOLVED in Iter #{f.resolvedIteration || '?'}
                        </div>
                      ) : (
                        <div style={{
                          padding: '0.35rem 0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: f.blocking ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                          border: `1px solid ${f.blocking ? '#ef4444' : '#f59e0b'}`,
                          color: f.blocking ? '#ef4444' : '#f59e0b',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}>
                          {f.blocking ? '❌ OPEN (BLOCKING)' : '⚠️ OPEN'}
                        </div>
                      )}
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                        First seen in #{f.firstSeenIteration}
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Override Modal */}
      {showOverrideModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}>
          <Card style={{ maxWidth: '500px', width: '100%', padding: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#f59e0b' }}>
              <Unlock size={20} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Override Merge Block
              </h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
              This will bypass the blocking check for PR #{pr.pullNumber} on GitHub and mark the review status as permissible for merge. An audit trail entry will be recorded.
            </p>

            <form onSubmit={handleOverride} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                  Authorizing Username
                </label>
                <input
                  type="text"
                  className="input"
                  value={overrideActor}
                  onChange={(e) => setOverrideActor(e.target.value)}
                  placeholder="e.g. aakashyadav27"
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                  Reason for Override
                </label>
                <textarea
                  className="input"
                  rows={3}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. False positive on internal mock function; verified in staging"
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="btn btn-secondary"
                  disabled={overriding}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={overriding}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  {overriding ? <Loader2 size={14} className="spin" /> : <Unlock size={14} />}
                  {overriding ? 'Applying...' : 'Confirm Override'}
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
