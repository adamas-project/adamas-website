import { useEffect, useState } from 'react';
import { api, type Decision, type Domain } from '../api';
import { domainVar } from '../tokens';

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
          <Detail data={detail} onNavigate={setSelected} onSupersede={supersede} />
        ) : (
          <p className="muted">Select a decision.</p>
        )}
      </div>
    </div>
  );
}

function Detail({
  data,
  onNavigate,
  onSupersede,
}: {
  data: { decision: Decision; neighbors: string[] };
  onNavigate: (id: string) => void;
  onSupersede: (id: string) => void;
}) {
  const d = data.decision;
  return (
    <div>
      <div className="id mono">{d.id}</div>
      <h2 style={{ marginTop: 4 }}>{d.title}</h2>
      <dl className="kv">
        <dt>Domain</dt><dd><span className="dot" style={{ color: domainVar(d.domain), background: domainVar(d.domain) }} />{d.domain}</dd>
        <dt>Date</dt><dd>{d.date}</dd>
        <dt>Status</dt><dd>{d.status ?? 'active'}{d.superseded_by ? <> → <button className="linkbtn" onClick={() => onNavigate(d.superseded_by!)}>{d.superseded_by}</button></> : null}</dd>
        <dt>Owner</dt><dd>{d.owner.role}{d.owner.name ? ` (${d.owner.name})` : ''}</dd>
        <dt>Dissent</dt><dd>{d.owner.dissent?.length ? d.owner.dissent.join(', ') : <span className="muted">none recorded</span>}</dd>
      </dl>

      <div className="section-title">Context (the why)</div>
      <p>{d.context}</p>
      <div className="section-title">Decision</div>
      <p>{d.decision}</p>

      {d.tradeoffs?.length ? (
        <>
          <div className="section-title">Trade-offs</div>
          <ul>{d.tradeoffs.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </>
      ) : null}

      <div className="section-title">Links (bi-directional)</div>
      <div className="pill-row">
        {(d.links ?? []).length
          ? d.links!.map((l) => <button key={l} className="tag linkbtn" onClick={() => onNavigate(l)}>{l}</button>)
          : <span className="muted">none</span>}
      </div>

      <div className="section-title">Sources (traceable)</div>
      <div className="pill-row">
        {(d.sources ?? []).length
          ? d.sources!.map((s) => <span key={s} className="tag mono">{s}</span>)
          : <span className="muted">none</span>}
      </div>

      <div style={{ marginTop: 16 }}>
        {d.status === 'active' && (
          <button onClick={() => onSupersede(d.id)}>Supersede this decision…</button>
        )}{' '}
        <a href="/api/export" download>Export full vault (Markdown + JSON)</a>
      </div>
    </div>
  );
}
