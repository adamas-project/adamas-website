import { useEffect, useState } from 'react';
import { api } from '../api';
import { useLang } from '../i18n';
import { MeetingCapture } from '../components/MeetingCapture';

const KINDS = ['doc', 'meeting', 'email', 'chat'] as const;
const DOMAINS = ['hiring', 'sales', 'product', 'finance', 'ops'] as const;

export function InboxView({ onChanged }: { onChanged: () => void }) {
  const { t } = useLang();
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

  async function autoFile() {
    setBusy(true);
    setMsg('');
    try {
      const r = await api.autoConfirm(0.8);
      setMsg(r.confirmedCount ? `Auto-filed ${r.confirmedCount} high-confidence decision(s). ${r.pending} left to review.` : 'Nothing met the auto-file confidence bar; review the rest below.');
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
        <h2 style={{ margin: 0, flex: 1 }}>{t('Capture Inbox')}</h2>
        {engine && <span className="badge gen" title="Active Hermes evaluation engine">Hermes: {engine}</span>}
      </div>
      <p className="muted" style={{ marginTop: 10 }}>
        {t('Paste a real meeting note, email, or memo. Hermes (your local model) reads it and proposes candidate decisions. Nothing enters the ledger until you confirm it — and nothing leaves your machine.')}
      </p>

      {connectors.length > 0 && (
        <>
          <div className="section-title">{t('Read-only connectors')}</div>
          <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
            {t('Connectors pull source material onto this machine — read-only, inbound only. Nothing is sent out.')}
          </p>
          <div className="pill-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
            {connectors.map((c) => (
              <div key={c.id} className="card" style={{ cursor: 'default', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div className="title">{t(c.label)}</div>
                  <div className="id mono">{t(c.location)}</div>
                  <div className="pill-row" style={{ marginTop: 4 }}>
                    <span className="badge live">{t('read-only')}</span>
                    <span className="badge">{c.network ? t('network') : t('local')}</span>
                  </div>
                </div>
                <button className="primary" onClick={() => pullConnector(c.id)} disabled={busy}>
                  {busy ? t('Pulling…') : t('Pull')}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <GmailLabelPanel />

      <MeetingCapture
        onChanged={() => {
          void load();
          onChanged();
        }}
      />

      <div className="section-title">{t('Capture from your own note')}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <textarea
          rows={6}
          style={{ width: '100%', resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: 13 }}
          placeholder={t('Paste your note here. e.g. "In the Q3 review we decided to drop the hourly rate card and quote fixed-scope packages. Owner: head of sales. The trade-off is more estimation risk on us."')}
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
        />
        <div className="toolbar" style={{ margin: 0 }}>
          <input
            style={{ flex: 1, minWidth: 180 }}
            placeholder={t('Title (optional)')}
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
          />
          <select value={noteKind} onChange={(e) => setNoteKind(e.target.value as (typeof KINDS)[number])} aria-label="Source kind">
            {KINDS.map((k) => <option key={k} value={k}>{t(k)}</option>)}
          </select>
          <input type="date" value={noteDate} onChange={(e) => setNoteDate(e.target.value)} aria-label="Decision date" />
          <select value={noteDomain} onChange={(e) => setNoteDomain(e.target.value)} aria-label="Domain hint">
            <option value="">{t('auto-detect domain')}</option>
            {DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <button className="primary" onClick={ingestNote} disabled={busy || !noteText.trim()}>
            {busy ? t('Reading…') : t('Extract decisions with Hermes')}
          </button>
        </div>
        {msg && <div className="notice ok">{msg}</div>}
        <div>
          <button className="ghost" onClick={ingestSamples} disabled={busy}>
            {t('Or try the built-in sample notes')}
          </button>
        </div>
      </div>

      <div className="section-title">{t('Pending candidates')} {candidates.length > 0 ? `(${candidates.length})` : ''}</div>
      {candidates.length > 0 && (
        <div className="toolbar" style={{ margin: '0 0 8px' }}>
          <button onClick={autoFile} disabled={busy} title="Auto-file every high-confidence candidate (reversible)">
            {t('⚡ Auto-file high-confidence')}
          </button>
        </div>
      )}
      {candidates.length === 0 && (
        <p className="muted">{t('No pending candidates yet. Paste a note above and let Hermes read it.')}</p>
      )}

      <div className="list" style={{ maxHeight: 'none' }}>
        {candidates.map((c) => (
          <div key={c.candidateId} className="card" style={{ cursor: 'default' }}>
            <div className="id">
              {c.draft.domain} · {t('confidence')} {(c.confidence * 100).toFixed(0)}% · {t('from')} <span className="mono">{c.source.ref}</span>
            </div>
            <div className="title">{c.draft.title}</div>
            <p className="muted" style={{ margin: '6px 0' }}>{c.draft.decision}</p>
            <div className="pill-row">
              <span className="tag">{t('owner')}: {c.draft.owner.role}</span>
              {c.draft.owner.dissent?.length ? <span className="tag">{t('dissent')}: {c.draft.owner.dissent.join(', ')}</span> : null}
              {(c.draft.tradeoffs ?? []).length ? <span className="tag">{c.draft.tradeoffs.length} {t('trade-off(s)')}</span> : null}
            </div>
            <div style={{ marginTop: 8 }}>
              <button className="primary" onClick={() => confirm(c.candidateId)}>{t('Confirm into ledger')}</button>{' '}
              <button className="ghost" onClick={() => dismiss(c.candidateId)}>{t('Dismiss')}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Opt-in: add a Gmail "ADAMAS/Decisions" label to threads that look like
// decisions. Only adds a label (never deletes/sends), using a Gmail app password.
function GmailLabelPanel() {
  const { t } = useLang();
  const [status, setStatus] = useState<{ configured: boolean; isGmail: boolean; user?: string; source: 'saved' | 'env' | null; label: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState('');
  const [appPass, setAppPass] = useState('');

  async function refreshStatus() {
    const s = await api.gmailStatus().catch(() => null);
    setStatus(s);
    return s;
  }
  useEffect(() => {
    void refreshStatus();
  }, []);

  async function act(label: string, fn: () => Promise<string>) {
    setBusy(true);
    setMsg('');
    try {
      setMsg(await fn());
    } catch (e) {
      setMsg(`${label}: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  const testConnection = () =>
    act(t('Connection failed'), async () => {
      const r = await api.gmailTestConnection();
      return `${t('Connected ✓')} — ${status?.user} (${r.mailbox}, ${r.messages} ${t('messages')})`;
    });

  const sendTest = () =>
    act(t('Test email failed'), async () => {
      const r = await api.gmailTestEmail();
      return `${t('Test email added to your inbox:')} “${r.subject}”. ${t('Now click “Label decision emails”.')}`;
    });

  const run = () =>
    act(t('Labeling failed'), async () => {
      const r = await api.gmailLabelDecisions();
      return r.labeled
        ? `${t('Labeled')} ${r.labeled} / ${r.scanned} ${t('emails as decisions.')}`
        : `${t('Scanned')} ${r.scanned} ${t('emails — none looked like decisions.')}`;
    });

  async function saveSettings() {
    if (!email.trim() || !appPass.trim()) {
      setMsg(t('Enter your Gmail address and app password.'));
      return;
    }
    setBusy(true);
    setMsg('');
    try {
      await api.gmailSaveSettings(email.trim(), appPass.trim());
      setAppPass('');
      setEditing(false);
      await refreshStatus();
      // Immediately verify the credentials so the user gets instant feedback.
      const r = await api.gmailTestConnection();
      setMsg(`${t('Connected ✓')} — ${email.trim()} (${r.mailbox}, ${r.messages} ${t('messages')})`);
    } catch (e) {
      setMsg(`${t('Connection failed')}: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    setMsg('');
    try {
      await api.gmailClearSettings();
      await refreshStatus();
      setMsg(t('Disconnected.'));
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!status) return null;

  const connected = status.configured && status.isGmail;
  const showForm = editing || !connected;

  return (
    <div style={{ marginTop: 16 }}>
      <div className="section-title">{t('Gmail decision labeling')}</div>
      <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
        {t('Scan your Gmail and add an “ADAMAS/Decisions” label to threads that look like business decisions. Only adds a label — never deletes, moves, or sends.')}
      </p>

      {showForm ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 460 }}>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            {t('Paste your Gmail address and a Gmail app password (Google Account → Security → App passwords — not your normal password).')}
          </p>
          <input
            type="email"
            placeholder="m@adamas-project.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder={t('16-character app password')}
            value={appPass}
            onChange={(e) => setAppPass(e.target.value)}
          />
          <div className="toolbar" style={{ margin: 0 }}>
            <button className="primary" onClick={saveSettings} disabled={busy}>
              {busy ? t('Saving…') : t('Save & connect')}
            </button>
            {connected && <button onClick={() => { setEditing(false); setMsg(''); }} disabled={busy}>{t('Cancel')}</button>}
          </div>
          <p className="muted" style={{ margin: 0, fontSize: 12 }}>
            {t('Stored locally on this machine only. Never sent anywhere except your own Gmail.')}
          </p>
        </div>
      ) : (
        <div className="toolbar" style={{ margin: 0, flexWrap: 'wrap' }}>
          <button onClick={testConnection} disabled={busy}>{t('Test connection')}</button>
          <button onClick={sendTest} disabled={busy} title={t('Adds a sample decision email to your inbox so you can see labeling work.')}>
            {t('Send test email')}
          </button>
          <button className="primary" onClick={run} disabled={busy}>
            {busy ? t('Labeling…') : t('Label decision emails')}
          </button>
          <span style={{ flex: 1 }} />
          <span className="muted" style={{ fontSize: 13 }}>{status.user}</span>
          <button onClick={() => { setEditing(true); setEmail(status.user ?? ''); setMsg(''); }} disabled={busy}>{t('Change')}</button>
          {status.source === 'saved' && <button onClick={disconnect} disabled={busy}>{t('Disconnect')}</button>}
        </div>
      )}
      {msg && <div className="notice ok" style={{ marginTop: 8 }}>{msg}</div>}
    </div>
  );
}
