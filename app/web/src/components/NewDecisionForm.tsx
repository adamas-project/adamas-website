import { useState } from 'react';
import { api, type Domain } from '../api';

const DOMAINS: Domain[] = ['hiring', 'sales', 'product', 'finance', 'ops'];

const splitCommas = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
const splitLines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);

// Add a decision by hand. The ledger assigns the id (from the domain), validates
// against the schema, and maintains bi-directional links on write.
export function NewDecisionForm({
  onCreated,
  onCancel,
}: {
  onCreated: (id: string) => void;
  onCancel: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [domain, setDomain] = useState<Domain>('sales');
  const [date, setDate] = useState(today);
  const [title, setTitle] = useState('');
  const [context, setContext] = useState('');
  const [decision, setDecision] = useState('');
  const [role, setRole] = useState('');
  const [name, setName] = useState('');
  const [dissent, setDissent] = useState('');
  const [tradeoffs, setTradeoffs] = useState('');
  const [links, setLinks] = useState('');
  const [sources, setSources] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const ready = title.trim() && context.trim() && decision.trim() && role.trim();

  async function save() {
    setBusy(true);
    setError('');
    try {
      const dissentArr = splitCommas(dissent).map((r) => r.replace(/\s+/g, '-').toLowerCase());
      const payload: Record<string, unknown> = {
        domain,
        date,
        title: title.trim(),
        context: context.trim(),
        decision: decision.trim(),
        owner: {
          role: role.trim().replace(/\s+/g, '-').toLowerCase(),
          ...(name.trim() ? { name: name.trim() } : {}),
          ...(dissentArr.length ? { dissent: dissentArr } : {}),
        },
        ...(splitLines(tradeoffs).length ? { tradeoffs: splitLines(tradeoffs) } : {}),
        ...(splitCommas(links).length ? { links: splitCommas(links).map((l) => l.toUpperCase()) } : {}),
        ...(splitLines(sources).length ? { sources: splitLines(sources) } : {}),
      };
      const r = await api.createDecision(payload);
      onCreated(r.decision.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <h2 style={{ margin: 0, flex: 1 }}>New decision</h2>
        <button className="ghost" onClick={onCancel}>Cancel</button>
      </div>
      <p className="muted">The ID is assigned automatically from the domain. Required fields are marked *.</p>

      <div className="toolbar" style={{ margin: '4px 0 0' }}>
        <label className="rolebox">domain*
          <select value={domain} onChange={(e) => setDomain(e.target.value as Domain)}>
            {DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
        <label className="rolebox">date*
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>

      <div className="section-title">Title* (the choice made, ≤120 chars)</div>
      <input style={{ width: '100%' }} maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Decline the automotive OEM frame contract" />

      <div className="section-title">Context* (the why)</div>
      <textarea style={{ width: '100%', resize: 'vertical' }} rows={3} value={context} onChange={(e) => setContext(e.target.value)} placeholder="Situation at the time: constraints, pressures, what was known." />

      <div className="section-title">Decision* (exact, falsifiable choice)</div>
      <textarea style={{ width: '100%', resize: 'vertical' }} rows={2} value={decision} onChange={(e) => setDecision(e.target.value)} />

      <div className="toolbar" style={{ marginTop: 12 }}>
        <label className="rolebox">owner role*
          <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="head-of-sales" />
        </label>
        <label className="rolebox">owner name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="optional" />
        </label>
      </div>

      <div className="section-title">Dissent (roles, comma-separated)</div>
      <input style={{ width: '100%' }} value={dissent} onChange={(e) => setDissent(e.target.value)} placeholder="head-of-ops, cfo" />

      <div className="section-title">Trade-offs (one per line)</div>
      <textarea style={{ width: '100%', resize: 'vertical' }} rows={2} value={tradeoffs} onChange={(e) => setTradeoffs(e.target.value)} />

      <div className="section-title">Links (decision IDs, comma-separated)</div>
      <input style={{ width: '100%' }} value={links} onChange={(e) => setLinks(e.target.value)} placeholder="FIN-016, SAL-017" />

      <div className="section-title">Sources (one per line)</div>
      <textarea style={{ width: '100%', resize: 'vertical' }} rows={2} value={sources} onChange={(e) => setSources(e.target.value)} placeholder="meeting:2026-06-18#weekly-review" />

      {error && <div className="notice danger" style={{ marginTop: 12 }}>{error}</div>}

      <div style={{ marginTop: 14 }}>
        <button className="primary" onClick={save} disabled={busy || !ready}>
          {busy ? 'Saving…' : 'Save decision'}
        </button>{' '}
        <button className="ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
