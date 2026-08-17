import React from 'react';
import Link from 'next/link';
import { CreditCard, CheckCircle, ExternalLink, Zap } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PLANS } from '@codelens/shared';

export const dynamic = 'force-dynamic';

export default function BillingPage() {
  const currentPlan = PLANS.free;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
          Billing & Subscription
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Configure your own billing and plan flow for this deployment.
        </p>
      </div>

      {/* Current Plan Overview */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Active Plan: {currentPlan.name}</h2>
              <Badge variant="success">Active</Badge>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Standard monthly free tier for open-source & evaluation.
            </p>
          </div>

          <Link href="/dashboard" className="btn btn-primary">
            Configure Billing <ExternalLink size={14} />
          </Link>
        </div>

        {/* Usage Progress Bar */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
            <span>Monthly Reviews Used</span>
            <strong>
              12 / {currentPlan.reviewsPerMonth === -1 ? 'Unlimited' : currentPlan.reviewsPerMonth}
            </strong>
          </div>
          <div
            style={{
              height: '8px',
              backgroundColor: 'var(--bg-tertiary)',
              borderRadius: '9999px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: '24%',
                height: '100%',
                backgroundColor: 'var(--accent-primary)',
                borderRadius: '9999px',
              }}
            />
          </div>
        </div>
      </Card>

      {/* Available Marketplace Plans */}
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
          Available Plans
        </h2>

        <div className="grid grid-cols-3 gap-6">
          {Object.values(PLANS).map((plan) => (
            <Card key={plan.tier} style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 600 }}>{plan.name}</h3>
                {plan.tier === 'pro' && <Badge variant="info">Popular</Badge>}
              </div>

              <div style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>
                ${plan.monthlyPriceCents / 100}{' '}
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                  / {plan.tier === 'team' ? 'seat / mo' : 'mo'}
                </span>
              </div>

              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', flex: 1, marginBottom: '1.5rem' }}>
                {plan.features.map((feat, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle size={14} color="var(--status-success)" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/dashboard"
                className={plan.tier === 'pro' ? 'btn btn-primary' : 'btn btn-secondary'}
                style={{ width: '100%', textAlign: 'center' }}
              >
                {plan.tier === 'free' ? 'Current Plan' : 'Upgrade Plan'}
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
