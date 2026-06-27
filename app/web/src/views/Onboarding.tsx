import { useEffect, useState } from 'react';
import { api } from '../api';
import { useLang } from '../i18n';

export function OnboardingView() {
  const { t, lang } = useLang();
  const [locale, setLocale] = useState('en');
  const [pricing, setPricing] = useState<any | null>(null);
  const [demoBusy, setDemoBusy] = useState(false);
  const [demoMsg, setDemoMsg] = useState('');

  async function loadDemo() {
    setDemoBusy(true);
    setDemoMsg('');
    try {
      const r = await api.demoSeed();
      setDemoMsg(
        r.noop
          ? t('All demo data is already loaded.')
          : `${t('Loaded demo data:')} ${r.decisions} ${t('decisions')}, ${r.knowledge} ${t('knowledge')}, ${r.people} ${t('people')}, ${r.records} ${t('records')}.`,
      );
    } catch (e) {
      setDemoMsg((e as Error).message);
    } finally {
      setDemoBusy(false);
    }
  }

  async function resetDemo() {
    if (typeof window !== 'undefined' && !window.confirm(t('This wipes ALL current data (decisions, knowledge, people, records, glossary) and loads a fresh demo database. Continue?'))) return;
    setDemoBusy(true);
    setDemoMsg(t('Resetting and reloading… this can take a minute.'));
    try {
      const r = await api.demoReset();
      setDemoMsg(`${t('Fresh demo loaded:')} ${r.decisions} ${t('decisions')}, ${r.knowledge} ${t('knowledge')}, ${r.people} ${t('people')}, ${r.records} ${t('records')}.`);
    } catch (e) {
      setDemoMsg((e as Error).message);
    } finally {
      setDemoBusy(false);
    }
  }

  // Follow the app language for pricing locale/currency, but allow overriding.
  useEffect(() => {
    setLocale(lang);
  }, [lang]);

  useEffect(() => {
    api.pricing(locale).then((r) => setPricing(r.pricing));
  }, [locale]);

  if (!pricing) return <div className="panel"><p className="muted">{t('Loading…')}</p></div>;
  const cur = pricing.currency;

  return (
    <div className="panel">
      <div className="toolbar">
        <h2 style={{ margin: 0, flex: 1 }}>{t('Onboarding & Engagement Model')}</h2>
        <label className="rolebox">
          {t('locale')}
          <select value={locale} onChange={(e) => setLocale(e.target.value)}>
            <option value="en">English (USD)</option>
            <option value="de">Deutsch (EUR)</option>
          </select>
        </label>
      </div>

      <div className="section-title">{t('Your journey')}</div>
      <div className="steps">
        {pricing.journey.map((s: string, i: number) => (
          <span key={i}>
            <span className="step">{i + 1}. {s}</span>
            {i < pricing.journey.length - 1 ? <span className="muted"> → </span> : null}
          </span>
        ))}
      </div>
      <p className="muted">{t('The only recurring task for your team is confirming surfaced decisions — minutes a week.')}</p>

      <div className="section-title">{t('One-time')}</div>
      <div className="pricing">
        {pricing.oneTime.map((o: any) => (
          <div key={o.id} className="tier">
            <div className="title">{o.name}</div>
            <div className="price">{cur}{o.amount.toLocaleString()}</div>
            <p className="muted" style={{ fontSize: 13 }}>{o.note}</p>
          </div>
        ))}
      </div>

      <div className="section-title">{pricing.subscriptionName} — {t('ongoing subscription')}</div>
      <div className="pricing">
        {pricing.tiers.map((tier: any) => (
          <div key={tier.id} className={`tier ${tier.mostCommon ? 'common' : ''}`}>
            <div className="title">{tier.name} {tier.mostCommon && <span className="badge gen">{t('most common')}</span>}</div>
            <div className="price">{cur}{tier.monthly.toLocaleString()}<span className="muted" style={{ fontSize: 14 }}>{t('/mo')}</span></div>
            <p className="muted">{tier.teamSize}</p>
          </div>
        ))}
      </div>
      <p className="muted">{pricing.annualNote}</p>

      <div className="section-title">{t('Demo data (for showcases)')}</div>
      <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
        {t('Fill every section with a sample company (decisions, knowledge, people, diligence records) to showcase ADAMAS. Safe to run repeatedly — it only adds what is missing.')}
      </p>
      <div className="toolbar" style={{ margin: 0 }}>
        <button className="primary" onClick={loadDemo} disabled={demoBusy}>
          {demoBusy ? t('Loading…') : t('Load demo data')}
        </button>
        <button onClick={resetDemo} disabled={demoBusy} title={t('Wipe everything and load a fresh demo database.')}>
          {t('Reset & reload demo data')}
        </button>
        {demoMsg && <span className="muted" style={{ fontSize: 13 }}>{demoMsg}</span>}
      </div>
    </div>
  );
}
