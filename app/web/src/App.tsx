import { useEffect, useState } from 'react';
import { api } from './api';
import { LedgerView } from './views/Ledger';
import { InboxView } from './views/Inbox';
import { GraphView } from './views/Graph';
import { AssetsView } from './views/Assets';
import { BoundaryView } from './views/Boundary';
import { OnboardingView } from './views/Onboarding';
import { KnowledgeView } from './views/Knowledge';

type Tab = 'ledger' | 'inbox' | 'graph' | 'assets' | 'knowledge' | 'boundary' | 'onboarding';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'ledger', label: 'The Ledger' },
  { id: 'inbox', label: 'Capture Inbox' },
  { id: 'graph', label: 'Decision Graph' },
  { id: 'assets', label: 'Asset Generation' },
  { id: 'knowledge', label: 'Knowledge' },
  { id: 'boundary', label: 'Boundary & Security' },
  { id: 'onboarding', label: 'Onboarding & Pricing' },
];

const ROLES = ['owner', 'cfo', 'head-of-sales', 'member'];

export function App() {
  const [tab, setTab] = useState<Tab>('ledger');
  const [role, setRole] = useState('owner');
  const [meta, setMeta] = useState<{ count: number; version: number } | null>(null);
  const [pending, setPending] = useState(0);

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
          ADAMAS<small>All Decisions And Memory Archive System</small>
        </div>
        <nav className="nav" aria-label="Primary">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={tab === t.id ? 'active' : ''}
              aria-current={tab === t.id ? 'page' : undefined}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              {t.id === 'inbox' && pending > 0 ? <span className="badge" style={{ marginLeft: 6 }}>{pending}</span> : null}
            </button>
          ))}
        </nav>
        <div className="spacer" />
        <div className="rolebox">
          <span>local-first · {meta ? `${meta.count} decisions` : '…'}</span>
          <label htmlFor="role">role</label>
          <select id="role" value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </header>

      <main className="content">
        {tab === 'ledger' && <LedgerView role={role} onChanged={refresh} />}
        {tab === 'inbox' && <InboxView onChanged={refresh} />}
        {tab === 'graph' && <GraphView />}
        {tab === 'assets' && <AssetsView />}
        {tab === 'knowledge' && <KnowledgeView />}
        {tab === 'boundary' && <BoundaryView onChanged={refresh} />}
        {tab === 'onboarding' && <OnboardingView />}
      </main>
    </div>
  );
}
