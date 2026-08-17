'use client';
import React from 'react';
import Link from 'next/link';

import {
  ShieldCheck,
  Zap,
  Code2,
  GitPullRequest,
  CheckCircle,
  ArrowRight,
  Terminal,
  Lock,
  Cpu,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header / Nav */}
      <header
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'rgba(10, 12, 16, 0.8)',
          backdropFilter: 'blur(8px)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          className="container"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '64px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--accent-primary)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '1rem',
              }}
            >
              R
            </div>
            <span style={{ fontWeight: 700, fontSize: '1.125rem' }}>PR Review Bot</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link href="/dashboard" className="btn btn-secondary">
              Dashboard
            </Link>
            <Link href="/dashboard" className="btn btn-primary">
              Open App <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{ padding: '5rem 0 3rem', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: '840px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.35rem 0.85rem',
              borderRadius: '9999px',
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.8125rem',
              color: 'var(--text-secondary)',
              marginBottom: '1.5rem',
            }}
          >
            <Zap size={14} color="var(--status-warning)" /> Powered by Google Gemini 2.0 Structured Reasoning
          </div>

          <h1
            style={{
              fontSize: '3rem',
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              marginBottom: '1.25rem',
            }}
          >
            Smarter PR Reviews That Protect Your Main Branch
          </h1>

          <p
            style={{
              fontSize: '1.125rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              marginBottom: '2rem',
            }}
          >
            A custom GitHub PR review bot for your own repositories. It inspects every pull request, flags risky changes, and helps block bad merges with a configurable review workflow.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <Link
              href="/dashboard"
              className="btn btn-primary"
              style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}
            >
              Open Dashboard
            </Link>
            <Link
              href="/dashboard"
              className="btn btn-secondary"
              style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}
            >
              View Admin Console
            </Link>
          </div>
        </div>
      </section>

      {/* Interactive PR Mockup */}
      <section style={{ padding: '2rem 0 4rem' }}>
        <div className="container" style={{ maxWidth: '960px' }}>
          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
            }}
          >
            {/* Window bar */}
            <div
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                padding: '0.75rem 1rem',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                GitHub Check Run • PR Review Bot
              </span>
            </div>

            {/* Check Run Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--status-danger)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    ✕
                  </div>
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>PR Review Bot — 1 Blocking Issue Found</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Required check failed • Blocks merge</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span className="badge badge-danger">Strict Mode</span>
                  <span className="badge badge-neutral">Score: 68/100</span>
                </div>
              </div>
            </div>

            {/* Code Diff & Finding Annotation */}
            <div style={{ padding: '1.25rem 1.5rem' }}>
              <div
                style={{
                  backgroundColor: '#0d1117',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  padding: '1rem',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8125rem',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ color: '#8b949e', marginBottom: '0.5rem' }}>// src/auth/session.service.ts:42</div>
                <div style={{ color: '#e6edf3' }}>  async function queryUserSession(userId: string) &#123;</div>
                <div style={{ color: '#ff7b72', backgroundColor: 'rgba(248, 81, 73, 0.15)', padding: '0.15rem 0.5rem' }}>
                  -   const sql = `SELECT * FROM sessions WHERE user_id = '$&#123;userId&#125;'`;
                </div>
                <div style={{ color: '#7ee787', backgroundColor: 'rgba(46, 160, 67, 0.15)', padding: '0.15rem 0.5rem' }}>
                  +   const sql = 'SELECT * FROM sessions WHERE user_id = $1';
                </div>
                <div style={{ color: '#e6edf3' }}>      return db.query(sql, [userId]);</div>
                <div style={{ color: '#e6edf3' }}>  &#125;</div>
              </div>

              {/* Bot Review Comment Box */}
              <div
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-strong)',
                  padding: '1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span className="badge badge-danger">🚨 CRITICAL</span>
                  <strong style={{ fontSize: '0.875rem' }}>SQL Injection Vulnerability</strong>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Direct string template interpolation allows unsanitized user inputs to execute arbitrary SQL commands. Use parameterized queries ($1, $2) to eliminate injection risk.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section style={{ padding: '4rem 0', backgroundColor: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Engineered for Production Teams
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Full coverage without language-specific AST bloat or false positive fatigue.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <Cpu size={20} color="var(--accent-primary)" />
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Multi-Language Intelligence</h3>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Native reasoning across TypeScript, Python, Go, Rust, Java, C#, SQL, and Dockerfiles with language-specific footgun detection.
              </p>
            </div>

            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <ShieldCheck size={20} color="var(--status-success)" />
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Merge Blocking & Checks</h3>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Integrates directly with GitHub branch protection. Choose between Strict mode (blocks bad PRs) and Advisory mode (comments only).
              </p>
            </div>

            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <Terminal size={20} color="var(--status-warning)" />
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>1-Click Override Command</h3>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Maintainers can bypass false positives instantly by commenting <code>/codelens override [reason]</code> with full audit logging.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section style={{ padding: '4rem 0' }}>
        <div className="container" style={{ maxWidth: '960px' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Transparent GitHub Marketplace Pricing
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Start for free on your open-source or small team repos.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {/* Free */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Free</h3>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '1rem' }}>
                $0 <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 400 }}>/ month</span>
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', flex: 1, marginBottom: '1.5rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={14} color="var(--status-success)" /> 50 PR reviews / month
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={14} color="var(--status-success)" /> Up to 3 active repositories
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={14} color="var(--status-success)" /> Advisory mode reviews
                </li>
              </ul>
              <Link href="/dashboard" className="btn btn-secondary" style={{ width: '100%' }}>
                Get Started
              </Link>
            </div>

            {/* Pro */}
            <div className="card" style={{ border: '2px solid var(--accent-primary)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Pro</h3>
                <span className="badge badge-info">Popular</span>
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '1rem' }}>
                $29 <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 400 }}>/ month</span>
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', flex: 1, marginBottom: '1.5rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={14} color="var(--status-success)" /> Unlimited PR reviews
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={14} color="var(--status-success)" /> Strict blocking mode + checks
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={14} color="var(--status-success)" /> <code>/codelens override</code> command
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={14} color="var(--status-success)" /> Custom repository rules
                </li>
              </ul>
              <Link href="/dashboard/billing" className="btn btn-primary" style={{ width: '100%' }}>
                Start Free Trial
              </Link>
            </div>

            {/* Team */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Team</h3>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '1rem' }}>
                $19 <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 400 }}>/ seat / mo</span>
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', flex: 1, marginBottom: '1.5rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={14} color="var(--status-success)" /> Everything in Pro
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={14} color="var(--status-success)" /> Org-wide policy controls
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={14} color="var(--status-success)" /> Audit log export & webhooks
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={14} color="var(--status-success)" /> Priority review queue
                </li>
              </ul>
              <Link href="/dashboard/billing" className="btn btn-secondary" style={{ width: '100%' }}>
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          marginTop: 'auto',
          borderTop: '1px solid var(--border-subtle)',
          padding: '2rem 0',
          backgroundColor: 'var(--bg-secondary)',
          fontSize: '0.875rem',
          color: 'var(--text-muted)',
        }}
      >
        <div
          className="container"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            © {new Date().getFullYear()} PR Review Bot. <strong style={{ color: 'var(--text-primary)' }}>Developed by Rushi Karlekar.</strong> All rights reserved.
          </div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <Link href="https://github.com/rushikeshk24" target="_blank" rel="noreferrer">
              Developer Profile
            </Link>
            <Link href="https://github.com" target="_blank" rel="noreferrer">Privacy Policy</Link>
            <Link href="https://github.com" target="_blank" rel="noreferrer">Documentation</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
