import { useEffect, useState } from 'react';
import { api, type Decision, type Domain } from '../api';
import { domainVar } from '../tokens';
import { DecisionDetail } from '../components/DecisionDetail';

const DOMAINS: Domain[] = ['hiring', 'sales', 'product', 'finance', 'ops'];

export function LedgerView({ role, onChanged }: { role: string; onChanged: () => void }) {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [domain, setDomain] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ decision: Decision; neighbors: string[] } | null>(null);
  const [error, setError] = useState('');

  async function load() {
    setError('');
    try {
      const res = await api.decisions({ domain, status, role });
      setDecisions(res.decisions);
      if (!res.decisions.find((d) => d.id === selected)) setSelected(res.decisions[0]?.id ?? null);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, [domain, status, role]);

  useEffect(() => {
    if (!selected) {
      setDetail(null);
      return;
    }
    api.decision(selected, role).then(setDetail).catch((e) => setError((e as Error).message));
  }, [selected, role]);

  async function supersede(id: string) {
    const title = prompt('Title of the superseding decision (the new choice):');
    if (!title) return;
    const dec = detail!.decision;
    await api.supersede(id, {
      domain: dec.domain,
      date: new Date().toISOString().slice(0, 10),
      title,
      context: `Supersedes ${id}. ${dec.title}`,
      decision: title,
      owner: { role: dec.owner.role },
    });
    onChanged();
    await load();
  }

  return (
    <div className="layout">
      <div className="panel">
        <h2>The Ledger</h2>
        <div className="toolbar">
          <select value={domain} onChange={(e) => setDomain(e.target.value)} aria-label="Filter by domain">
            <option value="">All domains</option>
            {DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            <option value="active">active</option>
            <option value="superseded">superseded</option>
            <option value="reversed">reversed</option>
          </select>
        </div>
        {error && <p className="err">{error}</p>}
        <div className="list">
          {decisions.map((d) => (
            <button
              key={d.id}
              className={`card ${selected === d.id ? 'selected' : ''}`}
              onClick={() => setSelected(d.id)}
            >
              <div className="id" style={{ color: 'var(--faint)' }}>
                <span className="dot" style={{ color: domainVar(d.domain), background: domainVar(d.domain) }} />
                {d.id} · {d.status ?? 'active'}
              </div>
              <div className="title">{d.title}</div>
            </button>
          ))}
          {decisions.length === 0 && <p className="muted">No decisions visible for this filter / role.</p>}
        </div>
      </div>

      <div className="panel">
        {detail ? (
          <>
            <DecisionDetail data={detail} onNavigate={setSelected} onSupersede={supersede} />
            <div style={{ marginTop: 16 }}>
              <a href="/api/export" download>Export full vault (Markdown + JSON)</a>
            </div>
          </>
        ) : (
          <p className="muted">Select a decision.</p>
        )}
      </div>
    </div>
  );
}
