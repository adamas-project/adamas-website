import { useEffect, useState } from 'react';
import { api } from './api';
import { useLang } from './i18n';
import { LedgerView } from './views/Ledger';
import { InboxView } from './views/Inbox';
import { GraphView } from './views/Graph';
import { AssetsView } from './views/Assets';
import { BoundaryView } from './views/Boundary';
import { OnboardingView } from './views/Onboarding';
import { KnowledgeView } from './views/Knowledge';
import { PeopleView } from './views/People';
import { DataRoomView } from './views/DataRoom';

type Tab = 'ledger' | 'inbox' | 'graph' | 'assets' | 'knowledge' | 'people' | 'dataroom' | 'boundary' | 'onboarding';

const TABS: Array<{ id: Tab; label: string }> = [
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

export function App() {
  const { t, lang, setLang } = useLang();
  const [tab, setTab] = useState<Tab>('ledger');
  const [role, setRole] = useState('owner');
  const [meta, setMeta] = useState<{ count: number; version: number } | null>(null);
  const [pending, setPending] = useState(0);
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
      <header className="topbar">
        <div className="brand">
          ADAMAS<small>{t('All Decisions And Memory Archive System')}</small>
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
          <span>{t('local-first')} · {meta ? `${meta.count} ${t('decisions')}` : '…'}</span>
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
    </div>
  );
}
