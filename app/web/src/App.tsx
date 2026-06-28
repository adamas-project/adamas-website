import { useEffect, useState } from 'react';
import { api } from './api';
import { useLang } from './i18n';
import { DashboardView } from './views/Dashboard';
import { LedgerView } from './views/Ledger';
import { InboxView } from './views/Inbox';
import { GraphView } from './views/Graph';
import { AssetsView } from './views/Assets';
import { BoundaryView } from './views/Boundary';
import { OnboardingView } from './views/Onboarding';
import { KnowledgeView } from './views/Knowledge';
import { PeopleView } from './views/People';
import { DataRoomView } from './views/DataRoom';

type Tab = 'dashboard' | 'ledger' | 'inbox' | 'graph' | 'assets' | 'knowledge' | 'people' | 'dataroom' | 'boundary' | 'onboarding';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'ledger', label: 'The Ledger' },
  { id: 'inbox', label: 'Capture Inbox' },
  { id: 'graph', label: 'Decision Graph' },
  { id: 'assets', label: 'Asset Generation' },
  { id: 'knowledge', label: 'Knowledge' },
  { id: 'people', label: 'People' },
  { id: 'dataroom', label: 'Data Room' },
  { id: 'boundary', label: 'Boundary & Security' },
  { id: 'onboarding', label: 'Onboarding & Pricing' },
];

const ROLES = ['owner', 'cfo', 'head-of-sales', 'member'];

type Theme = 'dark' | 'light' | 'matrix';
const THEMES: Theme[] = ['dark', 'light', 'matrix'];

// Bump this when the legal terms change to re-prompt all users for acceptance.
const TERMS_VERSION = '2026-06-v1';
const TERMS_KEY = 'adamas-terms';
const LEGAL_ENTITY = 'Falcon Intelligence Group LLC (operating as ADAMAS)';

// First-run clickwrap license gate. Blocks the app until the user accepts the
// current TERMS_VERSION. [TODO: counsel] — placeholder wording; have legal
// counsel finalize before release.
function LicenseGate({ onAccept }: { onAccept: () => void }) {
  const { t } = useLang();
  const year = new Date().getFullYear();
  return (
    <div className="license-gate-overlay" role="dialog" aria-modal="true" aria-labelledby="license-gate-title">
      <div className="license-gate-modal panel">
        <h2 id="license-gate-title" style={{ marginTop: 0 }}>{t('Before you continue')}</h2>
        <p>
          {t('By using ADAMAS you agree to the Terms of Use, Privacy Policy and End-User License Agreement.')}
        </p>
        <p className="muted" style={{ fontSize: 13 }}>
          {t('ADAMAS is proprietary software, licensed and not sold. All intellectual property and rights in the software remain with')} {LEGAL_ENTITY}. {t('The software is provided “as is”, without warranties of any kind. AI-generated content and the valuation-readiness score are not professional legal, financial, or investment advice. [TODO: counsel]')}
        </p>
        <p className="muted" style={{ fontSize: 13 }}>
          <a href="https://adamas-project.com/terms" target="_blank" rel="noreferrer">{t('Terms of Use')}</a>
          {' · '}
          <a href="https://adamas-project.com/privacy" target="_blank" rel="noreferrer">{t('Privacy Policy')}</a>
          {' · '}
          <a href="https://adamas-project.com/eula" target="_blank" rel="noreferrer">{t('End-User License Agreement')}</a>
        </p>
        <div className="toolbar" style={{ marginTop: 12 }}>
          <button className="primary" onClick={onAccept}>{t('I accept')}</button>
        </div>
        <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>
          © {year} {LEGAL_ENTITY}. {t('All rights reserved.')}
        </p>
      </div>
    </div>
  );
}

export function App() {
  const { t, lang, setLang } = useLang();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [role, setRole] = useState('owner');
  const [meta, setMeta] = useState<{ count: number; version: number } | null>(null);
  const [pending, setPending] = useState(0);
  const [brand, setBrand] = useState<{ companyName: string; tagline: string; accentColor: string } | null>(null);
  const [termsAccepted, setTermsAccepted] = useState<boolean>(() => {
    try {
      return localStorage.getItem(TERMS_KEY) === TERMS_VERSION;
    } catch {
      return false;
    }
  });

  function acceptTerms() {
    try {
      localStorage.setItem(TERMS_KEY, TERMS_VERSION);
    } catch {
      /* ignore */
    }
    setTermsAccepted(true);
  }

  // White-label branding: company name in the bar + optional accent color.
  useEffect(() => {
    api.brand().then((b) => {
      setBrand(b);
      if (b.accentColor) document.documentElement.style.setProperty('--accent', b.accentColor);
      else document.documentElement.style.removeProperty('--accent');
    }).catch(() => setBrand(null));
  }, []);
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const s = localStorage.getItem('adamas-theme');
      return s === 'light' || s === 'matrix' ? s : 'dark';
    } catch {
      return 'dark';
    }
  });
  useEffect(() => {
    // Dark is the default (no attribute); light/matrix set data-theme.
    if (theme === 'dark') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('adamas-theme', theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  async function refresh() {
    try {
      setMeta(await api.meta());
      setPending((await api.inbox()).pending);
    } catch {
      /* ignore */
    }
  }
  useEffect(() => {
    void refresh();
  }, [tab]);

  return (
    <div className="app">
      {!termsAccepted && <LicenseGate onAccept={acceptTerms} />}
      <header className="topbar">
        <div className="brand">
          {brand?.companyName || 'ADAMAS'}<small>{brand?.tagline || t('All Decisions And Memory Archive System')}</small>
        </div>
        <nav className="nav" aria-label="Primary">
          {TABS.map((tb) => (
            <button
              key={tb.id}
              className={tab === tb.id ? 'active' : ''}
              aria-current={tab === tb.id ? 'page' : undefined}
              onClick={() => setTab(tb.id)}
            >
              {t(tb.label)}
              {tb.id === 'inbox' && pending > 0 ? <span className="badge" style={{ marginLeft: 6 }}>{pending}</span> : null}
            </button>
          ))}
        </nav>
        <div className="spacer" />
        <div className="rolebox">
          <span title={t('Local-first by default — features you enable (cloud AI, Gmail labeling, email/calendar connectors) transmit data to services you choose.')}>{t('local-first by default')} · {meta ? `${meta.count} ${t('decisions')}` : '…'}</span>
          <label htmlFor="role">{t('role')}</label>
          <select id="role" value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <label htmlFor="theme">{t('theme')}</label>
          <select id="theme" value={theme} onChange={(e) => setTheme(e.target.value as Theme)}>
            {THEMES.map((th) => (
              <option key={th} value={th}>{t(th)}</option>
            ))}
          </select>
          <div className="lang-switch" role="group" aria-label="Language">
            <button className={`lang-opt ${lang === 'en' ? 'on' : ''}`} onClick={() => setLang('en')}>EN</button>
            <button className={`lang-opt ${lang === 'de' ? 'on' : ''}`} onClick={() => setLang('de')}>DE</button>
          </div>
        </div>
      </header>

      <main className="content">
        {tab === 'dashboard' && <DashboardView />}
        {tab === 'ledger' && <LedgerView role={role} onChanged={refresh} />}
        {tab === 'inbox' && <InboxView onChanged={refresh} />}
        {tab === 'graph' && <GraphView />}
        {tab === 'assets' && <AssetsView />}
        {tab === 'knowledge' && <KnowledgeView />}
        {tab === 'people' && <PeopleView />}
        {tab === 'dataroom' && <DataRoomView />}
        {tab === 'boundary' && <BoundaryView onChanged={refresh} />}
        {tab === 'onboarding' && <OnboardingView />}
      </main>

      <footer className="app-footer">
        <span>© {new Date().getFullYear()} {LEGAL_ENTITY.replace(' (operating as ADAMAS)', '')} — {t('ADAMAS is licensed, not sold.')}</span>
        {' · '}
        <a href="https://adamas-project.com/terms" target="_blank" rel="noreferrer">{t('Terms of Use')}</a>
        {' · '}
        <a href="https://adamas-project.com/privacy" target="_blank" rel="noreferrer">{t('Privacy Policy')}</a>
      </footer>
    </div>
  );
}
