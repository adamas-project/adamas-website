import { useEffect, useState } from 'react';
import { api } from '../api';

export function InboxView({ onChanged }: { onChanged: () => void }) {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function load() {
    setCandidates((await api.inbox('pending')).candidates);
  }
  useEffect(() => {
    void load();
  }, []);

  async function ingest() {
    setBusy(true);
    setMsg('');
    try {
      const r = await api.ingest();
      setMsg(`Hermes surfaced ${r.added} new candidate(s) from local sources.`);
      await load();
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function confirm(id: string) {
    await api.confirm(id);
    await load();
    onChanged();
  }
  async function dismiss(id: string) {
    await api.dismiss(id);
    await load();
    onChanged();
  }

  return (
    <div className="panel">
      <h2>Capture Inbox</h2>
      <p className="muted">
        Candidate decisions surfaced by Hermes from ingested sources. Nothing enters the ledger until you confirm it.
      </p>
      <div className="toolbar">
        <button className="primary" onClick={ingest} disabled={busy}>
          {busy ? 'Running Hermes…' : 'Run Hermes on local sources'}
        </button>
        {msg && <span className="ok">{msg}</span>}
      </div>

      {candidates.length === 0 && <p className="muted">No pending candidates. Run Hermes to surface some.</p>}

      <div className="list" style={{ maxHeight: 'none' }}>
        {candidates.map((c) => (
          <div key={c.candidateId} className="card" style={{ cursor: 'default' }}>
            <div className="id">
              {c.draft.domain} · confidence {(c.confidence * 100).toFixed(0)}% · from <span className="mono">{c.source.ref}</span>
            </div>
            <div className="title">{c.draft.title}</div>
            <p className="muted" style={{ margin: '6px 0' }}>{c.draft.decision}</p>
            <div className="pill-row">
              <span className="tag">owner: {c.draft.owner.role}</span>
              {c.draft.owner.dissent?.length ? <span className="tag">dissent: {c.draft.owner.dissent.join(', ')}</span> : null}
              {(c.draft.tradeoffs ?? []).length ? <span className="tag">{c.draft.tradeoffs.length} trade-off(s)</span> : null}
            </div>
            <div style={{ marginTop: 8 }}>
              <button className="primary" onClick={() => confirm(c.candidateId)}>Confirm into ledger</button>{' '}
              <button className="ghost" onClick={() => dismiss(c.candidateId)}>Dismiss</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
