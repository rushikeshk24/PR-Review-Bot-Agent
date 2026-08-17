'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { GitPullRequest, Settings, ArrowRight, ExternalLink, Plus, Github, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';

const GITHUB_APP_INSTALL_URL = 'https://github.com/apps/rushi-pr-review-bot/installations/new';
const GITHUB_APP_SETTINGS_URL = 'https://github.com/settings/apps/rushi-pr-review-bot';

export default function RepositoriesPage() {
  const [repos, setRepos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRepos = async () => {
    try {
      const installations = await api.getInstallations();
      const allRepos = installations.flatMap((inst: any) => inst.repositories || []);
      setRepos(allRepos);
    } catch (err) {
      console.error('Failed to load repos:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRepos();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadRepos();
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            Connected Repositories
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Repositories monitored by your <strong>Rushi-PR-Review-Bot</strong> GitHub App.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={handleRefresh}
            className="btn btn-secondary"
            disabled={refreshing}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <Link
            href={GITHUB_APP_INSTALL_URL}
            target="_blank"
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus size={16} /> Install on Repository <ExternalLink size={14} />
          </Link>
          <Link
            href={GITHUB_APP_SETTINGS_URL}
            target="_blank"
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Github size={16} /> App Settings <ExternalLink size={14} />
          </Link>
        </div>
      </div>

      {/* Repositories Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Loading your repositories...
        </div>
      ) : repos.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <GitPullRequest size={40} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>No Repositories Connected</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto 1.5rem' }}>
              Install the CodeLens AI GitHub App on your repositories to start receiving automatic PR reviews.
              Repositories appear here automatically after installation.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <Link
                href={GITHUB_APP_INSTALL_URL}
                target="_blank"
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Github size={16} /> Install GitHub App <ExternalLink size={14} />
              </Link>
              <button onClick={handleRefresh} className="btn btn-secondary" disabled={refreshing}>
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Repository</th>
                <th>Mode</th>
                <th>Threshold</th>
                <th>Auto-Review</th>
                <th>Analyzed PRs</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {repos.map((repo) => {
                const settings = repo.settings;
                const mode = settings?.blockingMode || 'ADVISORY';
                const threshold = settings?.severityThreshold || 'ERROR';
                const autoReview = settings?.autoReview ?? true;

                return (
                  <tr key={repo.id}>
                    <td>
                      <div>
                        <strong style={{ fontSize: '0.95rem' }}>{repo.fullName}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Default branch: <code>{repo.defaultBranch}</code>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge variant={mode === 'STRICT' ? 'danger' : 'info'}>{mode}</Badge>
                    </td>
                    <td>
                      <Badge variant={threshold === 'CRITICAL' || threshold === 'ERROR' ? 'warning' : 'neutral'}>
                        {threshold}
                      </Badge>
                    </td>
                    <td>
                      <Badge variant={autoReview ? 'success' : 'neutral'}>
                        {autoReview ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </td>
                    <td>{repo._count?.reviews || 0}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Link
                          href={`/dashboard/repos/${repo.id}`}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                        >
                          Reviews <ArrowRight size={12} />
                        </Link>
                        <Link
                          href={`/dashboard/repos/${repo.id}/settings`}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                        >
                          <Settings size={13} /> Settings
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
  );
}

