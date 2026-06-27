import { useEffect, useState } from 'react';
import { api } from '../api';
import { useLang } from '../i18n';

type Overview = Awaited<ReturnType<typeof api.dashboard>>;

function Tile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card" style={{ cursor: 'default', minWidth: 150, flex: '1 1 150px' }}>
      <div className="muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15 }}>{value}</div>
      {sub ? <div className="muted" style={{ fontSize: 12 }}>{sub}</div> : null}
    </div>
  );
}

export function DashboardView() {
  const { t } = useLang();
  const [d, setD] = useState<Overview | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.dashboard().then(setD).catch((e) => setErr((e as Error).message));
  }, []);

  if (err) return <div className="panel"><p className="muted">{err}</p></div>;
  if (!d) return <div className="panel"><p className="muted">{t('Loading…')}</p></div>;

  const cur = d.revenue.currency;
  const money = (n: number) => `${cur}${Math.round(n).toLocaleString()}`;
  const compact = (n: number) =>
    n >= 1_000_000 ? `${cur}${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${cur}${Math.round(n / 1_000)}k` : money(n);
  const maxYear = Math.max(1, ...d.revenue.byYear.map((y) => y.amount));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="panel">
        <h2 style={{ marginTop: 0 }}>{t('Overview')}</h2>
        <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
          {t('Everything at a glance — totals and money, calculated for you from the live data.')}
        </p>
        <div className="pill-row" style={{ gap: 10 }}>
          <Tile label={t('Decisions')} value={d.counts.decisions.toLocaleString()} sub={`${d.decisions.active} ${t('active')} · ${d.decisions.superseded} ${t('superseded')}`} />
          <Tile label={t('Knowledge')} value={d.counts.knowledge.toLocaleString()} />
          <Tile label={t('People')} value={d.counts.people.toLocaleString()} sub={`${d.people.keyPeople} ${t('key people')}`} />
          <Tile label={t('Records')} value={d.counts.records.toLocaleString()} />
          <Tile label={t('Glossary')} value={d.counts.glossary.toLocaleString()} sub={t('terms')} />
          <Tile label={t('Readiness')} value={`${d.readiness.score}/100`} sub={`${d.readiness.traceabilityPct}% ${t('sourced')}`} />
        </div>
      </div>

      <div className="panel">
        <div className="section-title">{t('Revenue & customers')}</div>
        <div className="pill-row" style={{ gap: 10 }}>
          <Tile label={t('Annual recurring revenue (ARR)')} value={compact(d.revenue.arr)} sub={t('recurring customer contracts')} />
          <Tile label={t('Total contract value')} value={compact(d.revenue.totalContractValue)} sub={`${t('incl. one-off')} ${compact(d.revenue.oneOff)}`} />
          <Tile label={t('Customers')} value={d.revenue.customers.toLocaleString()} sub={`${d.revenue.activeCustomers} ${t('active')} · ${d.revenue.atRiskCustomers} ${t('at risk')}`} />
          <Tile label={t('Average contract')} value={compact(d.revenue.avgContract)} />
        </div>

        {d.revenue.byYear.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div className="section-title">{t('Contract value by renewal year')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {d.revenue.byYear.map((y) => (
                <div key={y.year} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="mono" style={{ width: 48, fontSize: 13 }}>{y.year}</span>
                  <div style={{ flex: 1, background: 'var(--surface-2, rgba(255,255,255,0.06))', borderRadius: 6, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.max(3, (y.amount / maxYear) * 100)}%`, background: 'var(--accent)', height: 16, borderRadius: 6 }} />
                  </div>
                  <span className="muted" style={{ width: 90, textAlign: 'right', fontSize: 13 }}>{compact(y.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {d.revenue.topCustomers.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div className="section-title">{t('Top customers')}</div>
            <table>
              <thead><tr><th>{t('Customer')}</th><th>{t('Value')}</th><th>{t('Type')}</th><th>{t('Status')}</th></tr></thead>
              <tbody>
                {d.revenue.topCustomers.map((c) => (
                  <tr key={c.id}>
                    <td>{c.title}</td>
                    <td>{money(c.amount)}</td>
                    <td>{c.recurring ? t('recurring') : t('one-off')}</td>
                    <td>{c.status ? t(c.status) : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {d.keyMetrics.length > 0 && (
        <div className="panel">
          <div className="section-title">{t('Key financial metrics (latest)')}</div>
          <table>
            <thead><tr><th>{t('Metric')}</th><th>{t('Value')}</th><th>{t('Period')}</th></tr></thead>
            <tbody>
              {d.keyMetrics.map((m) => (
                <tr key={m.metric}>
                  <td>{m.metric}</td>
                  <td>{m.amount != null ? `${m.currency ?? ''}${m.amount.toLocaleString()}` : '—'}</td>
                  <td className="muted">{m.period ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="layout">
        <div className="panel">
          <div className="section-title">{t('Decisions by department')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {Object.entries(d.decisions.byDomain).map(([dom, n]) => (
              <div key={dom} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span>{t(dom)}</span><strong>{n}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="section-title">{t('People by type')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {Object.entries(d.people.byKind).map(([k, n]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span>{t(k)}</span><strong>{n}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="section-title">{t('Risk register')}</div>
          <div className="pill-row" style={{ gap: 8 }}>
            <span className="badge">{t('high')}: {d.risks.bySeverity.high}</span>
            <span className="badge">{t('medium')}: {d.risks.bySeverity.medium}</span>
            <span className="badge">{t('low')}: {d.risks.bySeverity.low}</span>
          </div>
          <div className="muted" style={{ fontSize: 13, marginTop: 8 }}>{d.risks.total} {t('risks tracked')}</div>
        </div>
      </div>
    </div>
  );
}
