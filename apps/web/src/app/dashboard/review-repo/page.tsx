'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Search, Star, GitFork, GitPullRequest, ExternalLink,
  Loader2, CheckCircle, AlertCircle, Clock, ArrowRight, Lock
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';

type ReviewState = 'idle' | 'queued' | 'error';

interface PRRow {
  number: number;
  title: string;
  author: string;
  authorAvatar: string;
  headSha: string;
  baseSha: string;
  baseBranch: string;
  headBranch: string;
  draft: boolean;
  updatedAt: string;
  url: string;
  reviewState: ReviewState;
  jobId?: string;
}

export default function ReviewRepoPage() {
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [repoInfo, setRepoInfo] = useState<any>(null);
  const [prs, setPrs] = useState<PRRow[]>([]);

  const handleFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;
    setLoading(true);
    setError('');
    setRepoInfo(null);
    setPrs([]);

    try {
      const result = await api.getRepoPRs(repoUrl.trim());
      setRepoInfo(result.repo);
      setPrs(result.prs.map((pr: any) => ({ ...pr, reviewState: 'idle' as ReviewState })));
    } catch (err: any) {
      setError(err.message || 'Failed to fetch repository.');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (pr: PRRow) => {
    setPrs((prev) =>
      prev.map((p) => (p.number === pr.number ? { ...p, reviewState: 'queued' } : p))
    );

    try {
      const result = await api.triggerManualReview({
        owner: repoInfo.owner,
        repo: repoInfo.name,
        pullNumber: pr.number,
        headSha: pr.headSha,
        baseSha: pr.baseSha,
        prTitle: pr.title,
        prAuthor: pr.author,
        baseBranch: pr.baseBranch,
        headBranch: pr.headBranch,
      });
      setPrs((prev) =>
        prev.map((p) =>
          p.number === pr.number ? { ...p, reviewState: 'queued', jobId: result.jobId } : p
        )
      );
    } catch (err: any) {
      setPrs((prev) =>
        prev.map((p) => (p.number === pr.number ? { ...p, reviewState: 'error' } : p))
      );
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
          Review a Repository
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Paste any public GitHub repository URL to fetch its open pull requests and run an AI review.
        </p>
      </div>

      {/* Search Form */}
      <Card style={{ padding: '1.5rem' }}>
        <form onSubmit={handleFetch}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search
                size={16}
                style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
              />
              <input
                type="text"
                className="input"
                placeholder="https://github.com/owner/repo  or  owner/repo"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                style={{ paddingLeft: '2.25rem' }}
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !repoUrl.trim()}
              style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              {loading ? <Loader2 size={15} className="spin" /> : <Search size={15} />}
              {loading ? 'Fetching...' : 'Fetch Repo'}
            </button>
          </div>
        </form>

        {/* Error */}
        {error && (
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem 1rem',
            backgroundColor: 'var(--status-danger-bg, rgba(239,68,68,0.1))',
            border: '1px solid var(--status-danger, #ef4444)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--status-danger, #ef4444)',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}
      </Card>

      {/* Repo Info Card */}
      {repoInfo && (
        <Card style={{ padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>{repoInfo.fullName}</h2>
                {repoInfo.language && (
                  <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>{repoInfo.language}</span>
                )}
              </div>
              {repoInfo.description && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  {repoInfo.description}
                </p>
              )}
              <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Star size={13} /> {repoInfo.stars.toLocaleString()} stars
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <GitFork size={13} /> {repoInfo.forks.toLocaleString()} forks
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <GitPullRequest size={13} /> {prs.length} open PR{prs.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <Link
              href={repoInfo.url}
              target="_blank"
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}
            >
              Open on GitHub <ExternalLink size={12} />
            </Link>
          </div>
        </Card>
      )}

      {/* PRs Table */}
      {repoInfo && prs.length === 0 && (
        <Card>
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
            <GitPullRequest size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.35rem' }}>No Open Pull Requests</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              This repository has no open PRs right now.
            </p>
          </div>
        </Card>
      )}

      {prs.length > 0 && (
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            Open Pull Requests
          </h2>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Title</th>
                  <th>Author</th>
                  <th>Branches</th>
                  <th>Updated</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {prs.map((pr) => (
                  <tr key={pr.number}>
                    <td>
                      <a
                        href={pr.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: 'var(--accent-primary)', fontWeight: 600, textDecoration: 'none' }}
                      >
                        #{pr.number}
                      </a>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{pr.title}</span>
                        {pr.draft && <Badge variant="neutral">Draft</Badge>}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {pr.authorAvatar && (
                          <img
                            src={pr.authorAvatar}
                            alt={pr.author}
                            width={20}
                            height={20}
                            style={{ borderRadius: '50%' }}
                          />
                        )}
                        <span style={{ fontSize: '0.8rem' }}>{pr.author}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {pr.baseBranch} ← {pr.headBranch}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(pr.updatedAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td>
                      {pr.reviewState === 'idle' && (
                        <button
                          onClick={() => handleReview(pr)}
                          className="btn btn-primary"
                          style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                          disabled={pr.draft}
                          title={pr.draft ? 'Cannot review a draft PR' : ''}
                        >
                          Review <ArrowRight size={13} />
                        </button>
                      )}
                      {pr.reviewState === 'queued' && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--status-success)' }}>
                          <CheckCircle size={14} /> Queued
                        </span>
                      )}
                      {pr.reviewState === 'error' && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--status-danger, #ef4444)' }}>
                          <AlertCircle size={14} /> Failed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {prs.some((p) => p.reviewState === 'queued') && (
            <div style={{
              marginTop: '1rem',
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--status-success-bg)',
              border: '1px solid var(--status-success)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.875rem',
              color: 'var(--status-success)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <Clock size={15} />
              Review job(s) queued. Results will appear in the{' '}
              <Link href="/dashboard" style={{ color: 'inherit', fontWeight: 600, textDecoration: 'underline' }}>
                Dashboard
              </Link>{' '}
              once the AI finishes analyzing the PR diff.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
