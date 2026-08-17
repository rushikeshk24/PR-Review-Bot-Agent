'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, CheckCircle, ShieldAlert } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';

export default function RepoSettingsPage({ params }: { params: { repoId: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [blockingMode, setBlockingMode] = useState<'STRICT' | 'ADVISORY'>('ADVISORY');
  const [severityThreshold, setSeverityThreshold] = useState<'CRITICAL' | 'ERROR' | 'WARNING' | 'INFO'>('ERROR');
  const [autoReview, setAutoReview] = useState(true);
  const [ignoredGlobs, setIgnoredGlobs] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState('');

  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await api.getRepoSettings(params.repoId);
        setBlockingMode(data.blockingMode?.toUpperCase() === 'STRICT' ? 'STRICT' : 'ADVISORY');
        setSeverityThreshold((data.severityThreshold as any) || 'ERROR');
        setAutoReview(data.autoReview ?? true);
        setIgnoredGlobs((data.ignoredGlobs || []).join('\n'));
        setCustomPrompt(data.customPrompt || '');
      } catch (err) {
        console.error('Error loading settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, [params.repoId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    try {
      const globsArray = ignoredGlobs
        .split('\n')
        .map((g) => g.trim())
        .filter(Boolean);

      await api.updateRepoSettings(params.repoId, {
        blockingMode,
        severityThreshold,
        autoReview,
        ignoredGlobs: globsArray,
        customPrompt,
      });

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update settings:', err);
      alert('Failed to save settings. Please check API connectivity.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '800px', margin: '2rem auto', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading repository settings...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <Link
          href={`/dashboard/repos/${params.repoId}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            color: 'var(--text-muted)',
            fontSize: '0.85rem',
            marginBottom: '0.5rem',
          }}
        >
          <ArrowLeft size={14} /> Back to Repository
        </Link>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Review Rules & Enforcement</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Configure merge blocking behavior, severity thresholds, and custom review rules.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Enforcement Mode */}
        <Card>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Enforcement Mode
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Choose whether CodeLens AI sets a failing status check that blocks GitHub merges or operates in advisory mode.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '0.85rem',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: blockingMode === 'ADVISORY' ? 'var(--bg-tertiary)' : 'transparent',
                cursor: 'pointer',
              }}
            >
              <input
                type="radio"
                name="blockingMode"
                value="ADVISORY"
                checked={blockingMode === 'ADVISORY'}
                onChange={() => setBlockingMode('ADVISORY')}
                style={{ marginTop: '0.2rem' }}
              />
              <div>
                <strong style={{ fontSize: '0.9rem' }}>Advisory Mode (Recommended for MVP)</strong>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Posts inline comments and review summaries. Always completes Check Run with neutral/success so merges are never blocked.
                </p>
              </div>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '0.85rem',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: blockingMode === 'STRICT' ? 'var(--bg-tertiary)' : 'transparent',
                cursor: 'pointer',
              }}
            >
              <input
                type="radio"
                name="blockingMode"
                value="STRICT"
                checked={blockingMode === 'STRICT'}
                onChange={() => setBlockingMode('STRICT')}
                style={{ marginTop: '0.2rem' }}
              />
              <div>
                <strong style={{ fontSize: '0.9rem' }}>Strict Blocking Mode</strong>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Fails the required Check Run if any issues at or above the chosen threshold are found. Maintainers can override via <code>/codelens override</code>.
                </p>
              </div>
            </label>
          </div>
        </Card>

        {/* Severity Threshold */}
        <Card>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Blocking Severity Threshold
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Minimum severity required to trigger a blocking failure in Strict Mode.
          </p>

          <select
            className="select"
            value={severityThreshold}
            onChange={(e) => setSeverityThreshold(e.target.value as any)}
          >
            <option value="CRITICAL">CRITICAL only (severe security vulnerabilities, fatal crashes)</option>
            <option value="ERROR">ERROR and CRITICAL (standard production bugs & risks)</option>
            <option value="WARNING">WARNING, ERROR, and CRITICAL (includes code smells & anti-patterns)</option>
            <option value="INFO">INFO and above (flag all suggestions)</option>
          </select>
        </Card>

        {/* Ignored Files */}
        <Card>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Ignored File Globs
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            File patterns to exclude from AI analysis (one pattern per line).
          </p>

          <textarea
            className="textarea"
            rows={5}
            value={ignoredGlobs}
            onChange={(e) => setIgnoredGlobs(e.target.value)}
            placeholder="**/package-lock.json&#10;**/*.min.js&#10;**/dist/**"
          />
        </Card>

        {/* Custom Repo Rules */}
        <Card>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Custom Repository Guidelines
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Special instructions or internal architectural guidelines injected into Gemini's review prompt for this repository.
          </p>

          <textarea
            className="textarea"
            rows={4}
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="e.g. Always ensure database transactions are used when updating billing records. Prefer date-fns over moment.js."
          />
        </Card>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            {savedSuccess && (
              <span style={{ color: 'var(--status-success)', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.875rem' }}>
                <CheckCircle size={16} /> Settings saved successfully
              </span>
            )}
          </div>
          <Button type="submit" disabled={saving}>
            <Save size={16} /> {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </form>
    </div>
  );
}
