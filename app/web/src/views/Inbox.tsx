import { useEffect, useState } from 'react';
import { api } from '../api';

const KINDS = ['doc', 'meeting', 'email', 'chat'] as const;
const DOMAINS = ['hiring', 'sales', 'product', 'finance', 'ops'] as const;

export function InboxView({ onChanged }: { onChanged: () => void }) {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [engine, setEngine] = useState('');
  const [connectors, setConnectors] = useState<any[]>([]);

  // "Paste your own note" form state.
  const today = new Date().toISOString().slice(0, 10);
  const [noteText, setNoteText] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteKind, setNoteKind] = useState<(typeof KINDS)[number]>('meeting');
  const [noteDate, setNoteDate] = useState(today);
  const [noteDomain, setNoteDomain] = useState('');

  async function load() {
    setCandidates((await api.inbox('pending')).candidates);
  }
  useEffect(() => {
    void load();
    api
      .meta()
      .then((m: any) => {
        const h = m.hermes;
        setEngine(h?.provider === 'ollama' ? `ollama · ${h.model}` : 'built-in (offline)');
      })
      .catch(() => setEngine(''));
    api.connectors().then((r) => setConnectors(r.connectors)).catch(() => setConnectors([]));
  }, []);

  async function pullConnector(id: string) {
    setBusy(true);
    setMsg('');
    try {
      const r = await api.pullConnector(id);
      setMsg(
        r.newDocuments > 0
          ? `Pulled ${r.newDocuments} new source(s) (${r.skipped} unchanged) → Hermes surfaced ${r.added} candidate(s).`
          : `No new sources (${r.skipped} unchanged). Drop files into the folder and pull again.`,
      );
      await load();
      onChanged();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function ingestNote() {
    if (!noteText.trim()) return;
    setBusy(true);
    setMsg('');
    try {
      const ref = `paste:${noteDate}#${Math.random().toString(36).slice(2, 8)}`;
      const doc: Record<string, unknown> = {
        ref,
        kind: noteKind,
        date: noteDate,
        title: noteTitle.trim() || noteText.trim().split('\n')[0]!.slice(0, 80) || 'Pasted note',
        text: noteText.trim(),
      };
      if (noteDomain) doc.domainHint = noteDomain;
      const r = await api.ingestSources([doc]);
      setMsg(
        r.added > 0
          ? `Hermes found ${r.added} candidate decision(s) in your note — review them below.`
          : 'Hermes found no clear decision in that note. Try including the choice that was made (e.g. "We decided to…").',
      );
      if (r.added > 0) setNoteText('');
      await load();
      onChanged();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function ingestSamples() {
    setBusy(true);
    setMsg('');
    try {
      const r = await api.ingest();
      setMsg(`Hermes surfaced ${r.added} new candidate(s) from the built-in sample notes.`);
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <h2 style={{ margin: 0, flex: 1 }}>Capture Inbox</h2>
        {engine && <span className="badge gen" title="Active Hermes evaluation engine">Hermes: {engine}</span>}
      </div>
      <p className="muted" style={{ marginTop: 10 }}>
        Paste a real meeting note, email, or memo. Hermes (your local model) reads it and proposes candidate
        decisions. Nothing enters the ledger until you confirm it — and nothing leaves your machine.
      </p>

      {connectors.length > 0 && (
        <>
          <div className="section-title">Read-only connectors</div>
          <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
            Connectors pull source material onto this machine — read-only, inbound only. Nothing is sent out.
          </p>
          <div className="pill-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
            {connectors.map((c) => (
              <div key={c.id} className="card" style={{ cursor: 'default', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div className="title">{c.label}</div>
                  <div className="id mono">{c.location}</div>
                  <div className="pill-row" style={{ marginTop: 4 }}>
                    <span className="badge live">read-only</span>
                    <span className="badge">{c.network ? 'network' : 'local'}</span>
                  </div>
                </div>
                <button className="primary" onClick={() => pullConnector(c.id)} disabled={busy}>
                  {busy ? 'Pulling…' : 'Pull'}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="section-title">Capture from your own note</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <textarea
          rows={6}
          style={{ width: '100%', resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: 13 }}
          placeholder={'Paste your note here. e.g.\n"In the Q3 review we decided to drop the hourly rate card and quote fixed-scope packages. Owner: head of sales. The trade-off is more estimation risk on us."'}
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
        />
        <div className="toolbar" style={{ margin: 0 }}>
          <input
            style={{ flex: 1, minWidth: 180 }}
            placeholder="Title (optional)"
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
          />
          <select value={noteKind} onChange={(e) => setNoteKind(e.target.value as (typeof KINDS)[number])} aria-label="Source kind">
            {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <input type="date" value={noteDate} onChange={(e) => setNoteDate(e.target.value)} aria-label="Decision date" />
          <select value={noteDomain} onChange={(e) => setNoteDomain(e.target.value)} aria-label="Domain hint">
            <option value="">auto-detect domain</option>
            {DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <button className="primary" onClick={ingestNote} disabled={busy || !noteText.trim()}>
            {busy ? 'Reading…' : 'Extract decisions with Hermes'}
          </button>
        </div>
        {msg && <div className="notice ok">{msg}</div>}
        <div>
          <button className="ghost" onClick={ingestSamples} disabled={busy}>
            Or try the built-in sample notes
          </button>
        </div>
      </div>

      <div className="section-title">Pending candidates {candidates.length > 0 ? `(${candidates.length})` : ''}</div>
      {candidates.length === 0 && (
        <p className="muted">No pending candidates yet. Paste a note above and let Hermes read it.</p>
      )}

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
