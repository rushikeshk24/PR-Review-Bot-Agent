import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ShieldAlert, ArrowLeft, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function OverridesLogPage() {
  let overrides: any[] = [];
  try {
    overrides = await api.getOverrides(100);
  } catch {}

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
          Override Audit Log
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Immutable compliance record of all manual check dismissals, maintainer actors, and provided justifications.
        </p>
      </div>

      {overrides.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <ShieldCheck size={40} color="var(--status-success)" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.25rem' }}>No Manual Overrides Recorded</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              When maintainers dismiss a blocked check using <code>/codelens override</code>, the event is logged here for auditing.
            </p>
          </div>
        </Card>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Actor</th>
                <th>Repository</th>
                <th>PR #</th>
                <th>Reason Provided</th>
                <th>Transition</th>
                <th>Method</th>
                <th>Timestamp</th>
                <th>Action</th>
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
                    {override.reason ? (
                      <span>{override.reason}</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>None specified</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Badge variant="danger">{override.previousConclusion}</Badge>
                      <span style={{ color: 'var(--text-muted)' }}>→</span>
                      <Badge variant="neutral">{override.newConclusion}</Badge>
                    </div>
                  </td>
                  <td>
                    <Badge variant="neutral">{override.method}</Badge>
                  </td>
                  <td>{new Date(override.createdAt).toLocaleString()}</td>
                  <td>
                    {override.prReviewId && (
                      <Link
                        href={`/dashboard/reviews/${override.prReviewId}`}
                        className="btn btn-secondary"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                      >
                        View Review
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
