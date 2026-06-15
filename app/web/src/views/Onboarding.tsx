import { useEffect, useState } from 'react';
import { api } from '../api';

export function OnboardingView() {
  const [locale, setLocale] = useState('en');
  const [pricing, setPricing] = useState<any | null>(null);

  useEffect(() => {
    api.pricing(locale).then((r) => setPricing(r.pricing));
  }, [locale]);

  if (!pricing) return <div className="panel"><p className="muted">Loading…</p></div>;
  const cur = pricing.currency;

  return (
    <div className="panel">
      <div className="toolbar">
        <h2 style={{ margin: 0, flex: 1 }}>Onboarding & Engagement Model</h2>
        <label className="rolebox">
          locale
          <select value={locale} onChange={(e) => setLocale(e.target.value)}>
            <option value="en">English (USD)</option>
            <option value="de">Deutsch (EUR)</option>
          </select>
        </label>
      </div>

      <div className="section-title">Your journey</div>
      <div className="steps">
        {pricing.journey.map((s: string, i: number) => (
          <span key={i}>
            <span className="step">{i + 1}. {s}</span>
            {i < pricing.journey.length - 1 ? <span className="muted"> → </span> : null}
          </span>
        ))}
      </div>
      <p className="muted">The only recurring task for your team is confirming surfaced decisions — minutes a week.</p>

      <div className="section-title">One-time</div>
      <div className="pricing">
        {pricing.oneTime.map((o: any) => (
          <div key={o.id} className="tier">
            <div className="title">{o.name}</div>
            <div className="price">{cur}{o.amount.toLocaleString()}</div>
            <p className="muted" style={{ fontSize: 13 }}>{o.note}</p>
          </div>
        ))}
      </div>

      <div className="section-title">{pricing.subscriptionName} — ongoing subscription</div>
      <div className="pricing">
        {pricing.tiers.map((t: any) => (
          <div key={t.id} className={`tier ${t.mostCommon ? 'common' : ''}`}>
            <div className="title">{t.name} {t.mostCommon && <span className="badge gen">most common</span>}</div>
            <div className="price">{cur}{t.monthly.toLocaleString()}<span className="muted" style={{ fontSize: 14 }}>/mo</span></div>
            <p className="muted">{t.teamSize}</p>
          </div>
        ))}
      </div>
      <p className="muted">{pricing.annualNote}</p>
    </div>
  );
}
