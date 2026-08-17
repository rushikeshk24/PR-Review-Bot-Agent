'use client';

import React, { useState } from 'react';
import { Search, Loader2, AlertCircle, CheckCircle, Shield, Zap, Code2,
         Star, ChevronDown, ChevronRight, ExternalLink, FileSearch,
         TrendingUp, AlertTriangle, Info, XCircle, Lightbulb, FileCode } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api';

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  CRITICAL: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', icon: XCircle,    label: 'Critical' },
  ERROR:    { color: '#f97316', bg: 'rgba(249,115,22,0.1)', icon: AlertCircle, label: 'Error'    },
  WARNING:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: AlertTriangle, label: 'Warning' },
  INFO:     { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', icon: Info,       label: 'Info'     },
};

const CATEGORY_ICONS: Record<string, any> = {
  security:       Shield,
  bug:            AlertCircle,
  performance:    Zap,
  'code-quality': Code2,
  'best-practice': Star,
  maintainability: TrendingUp,
};

function ScoreRing({ score }: { score: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ position: 'relative', width: 140, height: 140, flexShrink: 0 }}>
      <svg width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="70" cy="70" r={r} fill="none" stroke="var(--border-subtle)" strokeWidth="10" />
        <circle cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '2rem', fontWeight: 800, color }}>{score}</span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '-2px' }}>/ 100</span>
      </div>
    </div>
  );
}

function FindingRow({ f }: { f: any }) {
  const [open, setOpen] = useState(false);
  const sev = SEVERITY_CONFIG[f.severity] || SEVERITY_CONFIG.INFO;
  const SevIcon = sev.icon;
  const CatIcon = CATEGORY_ICONS[f.category] || Code2;
  return (
    <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: '0.5rem' }}>
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '0.75rem 1rem', background: open ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
        border: 'none', cursor: 'pointer', textAlign: 'left',
      }}>
        <SevIcon size={15} color={sev.color} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--text-muted)', flexShrink: 0 }}>
          {f.file}:{f.line}
        </span>
        <span style={{ fontSize: '0.875rem', fontWeight: 600, flex: 1, color: 'var(--text-primary)' }}>{f.title}</span>
        <span style={{
          fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '999px',
          backgroundColor: sev.bg, color: sev.color, fontWeight: 600, flexShrink: 0,
        }}>{sev.label}</span>
        <span style={{ padding: '0.15rem 0.45rem', borderRadius: '999px', fontSize: '0.7rem',
          background: 'var(--bg-tertiary)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
          <CatIcon size={10} />{f.category}
        </span>
        {open ? <ChevronDown size={14} color="var(--text-muted)" /> : <ChevronRight size={14} color="var(--text-muted)" />}
      </button>
      {open && (
        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f.description}</p>
          {f.suggestedFix && (
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Lightbulb size={12} /> Suggested Fix
              </p>
              <pre style={{
                fontSize: '0.78rem', background: 'var(--bg-primary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)',
                overflowX: 'auto', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', border: '1px solid var(--border-subtle)',
              }}>{f.suggestedFix}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type AuditStep = 'idle' | 'fetching' | 'analyzing' | 'done' | 'error';

const STEPS = [
  { key: 'fetching',  label: 'Fetching repo & file tree from GitHub...' },
  { key: 'analyzing', label: 'Gemini AI is analyzing your codebase...' },
  { key: 'done',      label: 'Audit complete!' },
];

export default function CodebaseAuditPage() {
  const [repoUrl, setRepoUrl] = useState('');
  const [step, setStep] = useState<AuditStep>('idle');
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);
  const [activeFilter, setActiveFilter] = useState<string>('ALL');

  const handleAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;
    setError('');
    setResult(null);
    setActiveFilter('ALL');
    setStep('fetching');

    // Simulate step progress for UX
    const timer = setTimeout(() => setStep('analyzing'), 3000);
    try {
      const data = await api.auditCodebase(repoUrl.trim());
      clearTimeout(timer);
      setResult(data);
      setStep('done');
    } catch (err: any) {
      clearTimeout(timer);
      setError(err.message || 'Audit failed. Please try again.');
      setStep('error');
    }
  };

  const findings: any[] = result?.findings || [];
  const severityCounts = {
    CRITICAL: findings.filter((f) => f.severity === 'CRITICAL').length,
    ERROR:    findings.filter((f) => f.severity === 'ERROR').length,
    WARNING:  findings.filter((f) => f.severity === 'WARNING').length,
    INFO:     findings.filter((f) => f.severity === 'INFO').length,
  };
  const filtered = activeFilter === 'ALL' ? findings : findings.filter((f) => f.severity === activeFilter);

  const isLoading = step === 'fetching' || step === 'analyzing';

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
          <FileSearch size={22} color="var(--accent-primary)" />
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Codebase Audit</h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Paste any public GitHub repo URL. Gemini AI will fetch all source files and produce a full security &amp; quality audit.
        </p>
      </div>

      {/* Input */}
      <Card style={{ padding: '1.5rem' }}>
        <form onSubmit={handleAudit}>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input className="input" type="text"
                placeholder="https://github.com/owner/repo"
                value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)}
                style={{ paddingLeft: '2.25rem' }} disabled={isLoading} />
            </div>
            <button type="submit" className="btn btn-primary" disabled={isLoading || !repoUrl.trim()}
              style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', minWidth: '130px', justifyContent: 'center' }}>
              {isLoading ? <Loader2 size={15} className="spin" /> : <FileSearch size={15} />}
              {isLoading ? 'Auditing...' : 'Audit Repo'}
            </button>
          </div>
        </form>

        {/* Progress steps */}
        {isLoading && (
          <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {STEPS.slice(0, 2).map((s, i) => {
              const active = s.key === step;
              const done = (step === 'analyzing' && i === 0);
              return (
                <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem',
                  color: active ? 'var(--text-primary)' : done ? 'var(--status-success)' : 'var(--text-muted)' }}>
                  {done ? <CheckCircle size={15} color="var(--status-success)" /> : active ? <Loader2 size={15} className="spin" /> : <div style={{ width: 15, height: 15, borderRadius: '50%', border: '2px solid var(--border-subtle)' }} />}
                  {s.label}
                </div>
              );
            })}
          </div>
        )}

        {/* Error */}
        {step === 'error' && (
          <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.1)',
            border: '1px solid #ef4444', borderRadius: 'var(--radius-sm)', color: '#ef4444',
            fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={16} />{error}
          </div>
        )}
      </Card>

      {/* Results */}
      {result && (
        <>
          {/* Score + Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '1.25rem' }}>
            {/* Score card */}
            <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', minWidth: '180px' }}>
              <ScoreRing score={result.overallScore} />
              <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>Health Score</p>
              <a href={result.repoUrl} target="_blank" rel="noreferrer"
                style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}>
                {result.repoFullName} <ExternalLink size={11} />
              </a>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {result.fileCount} files · {result.linesAnalyzed?.toLocaleString()} lines
              </span>
            </Card>

            {/* Severity breakdown */}
            <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 600 }}>Findings Breakdown</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                {Object.entries(SEVERITY_CONFIG).map(([sev, cfg]) => {
                  const SIcon = cfg.icon;
                  const count = severityCounts[sev as keyof typeof severityCounts];
                  return (
                    <button key={sev} onClick={() => setActiveFilter(activeFilter === sev ? 'ALL' : sev)}
                      style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: `2px solid ${activeFilter === sev ? cfg.color : 'var(--border-subtle)'}`,
                        background: activeFilter === sev ? cfg.bg : 'var(--bg-primary)', cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem', transition: 'all 0.15s' }}>
                      <SIcon size={18} color={cfg.color} />
                      <span style={{ fontSize: '1.4rem', fontWeight: 800, color: cfg.color }}>{count}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{cfg.label}</span>
                    </button>
                  );
                })}
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Click a severity to filter · {findings.length} total findings · Analyzed in {((result.durationMs || 0) / 1000).toFixed(1)}s
              </p>
            </Card>
          </div>

          {/* Summary */}
          <Card style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Executive Summary</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{result.summary}</p>
          </Card>

          {/* Positives + Recommendations side by side */}
          {(result.positives?.length > 0 || result.recommendations?.length > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              {result.positives?.length > 0 && (
                <Card style={{ padding: '1.25rem' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--status-success)' }}>
                    <CheckCircle size={15} /> What's Good
                  </h3>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {result.positives.map((p: string, i: number) => (
                      <li key={i} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                        <span style={{ color: 'var(--status-success)', marginTop: '2px', flexShrink: 0 }}>✓</span>{p}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
              {result.recommendations?.length > 0 && (
                <Card style={{ padding: '1.25rem' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-primary)' }}>
                    <Lightbulb size={15} /> Top Recommendations
                  </h3>
                  <ol style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '1.25rem' }}>
                    {result.recommendations.map((r: string, i: number) => (
                      <li key={i} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{r}</li>
                    ))}
                  </ol>
                </Card>
              )}
            </div>
          )}

          {/* Findings list */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>
                Findings {activeFilter !== 'ALL' && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>— filtered to {activeFilter}</span>}
              </h3>
              {activeFilter !== 'ALL' && (
                <button onClick={() => setActiveFilter('ALL')} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}>
                  Clear filter
                </button>
              )}
            </div>
            {filtered.length === 0 ? (
              <Card>
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <CheckCircle size={32} color="var(--status-success)" style={{ margin: '0 auto 0.5rem' }} />
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No findings for this filter.</p>
                </div>
              </Card>
            ) : (
              <div>{filtered.map((f: any, i: number) => <FindingRow key={i} f={f} />)}</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
