import { useRef, useState } from 'react';
import { api } from '../api';

// Two ways to capture a meeting's decisions when there's no recording link:
// (1) type the outcome by hand, or (2) upload/paste a transcript that ADAMAS
// summarizes locally before extracting candidate decisions.
export function MeetingCapture({ onChanged }: { onChanged: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [summary, setSummary] = useState('');

  // Manual outcome form
  const [mTitle, setMTitle] = useState('');
  const [mDate, setMDate] = useState(today);
  const [mAttendees, setMAttendees] = useState('');
  const [mOutcome, setMOutcome] = useState('');

  // Transcript
  const [tTitle, setTTitle] = useState('');
  const [tDate, setTDate] = useState(today);
  const [tText, setTText] = useState('');

  async function logOutcome() {
    if (!mTitle.trim() || !mOutcome.trim()) return;
    setBusy(true);
    setMsg('');
    setSummary('');
    try {
      const text = [
        `Meeting: ${mTitle.trim()}`,
        mAttendees.trim() ? `Attendees: ${mAttendees.trim()}` : '',
        `Outcome: ${mOutcome.trim()}`,
      ]
        .filter(Boolean)
        .join('\n');
      const ref = `meeting:${mDate}#${Math.random().toString(36).slice(2, 8)}`;
      const r = await api.ingestSources([{ ref, kind: 'meeting', date: mDate, title: mTitle.trim(), text }]);
      setMsg(
        r.added > 0
          ? `Hermes found ${r.added} decision(s) in the outcome — review them below.`
          : 'No clear decision found. Make sure the outcome states the choice that was made.',
      );
      if (r.added > 0) setMOutcome('');
      onChanged();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!tTitle) setTTitle(f.name.replace(/\.[^.]+$/, ''));
    const reader = new FileReader();
    reader.onload = () => setTText(String(reader.result ?? ''));
    reader.readAsText(f);
  }

  async function summarizeTranscript() {
    if (!tText.trim()) return;
    setBusy(true);
    setMsg('');
    setSummary('');
    try {
      const r = await api.transcript({ text: tText, title: tTitle || undefined, date: tDate });
      if (r.summarized) setSummary(r.summary);
      setMsg(
        r.added > 0
          ? `Summarized the transcript and Hermes surfaced ${r.added} decision(s) — review them below.`
          : 'Summarized, but no clear decision was found. You can still log the outcome manually above.',
      );
      if (r.added > 0) {
        setTText('');
        if (fileRef.current) fileRef.current.value = '';
      }
      onChanged();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="section-title">Log a meeting outcome (no recording needed)</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="toolbar" style={{ margin: 0 }}>
          <input style={{ flex: 1, minWidth: 200 }} placeholder="Meeting title" value={mTitle} onChange={(e) => setMTitle(e.target.value)} />
          <input type="date" value={mDate} onChange={(e) => setMDate(e.target.value)} aria-label="Meeting date" />
        </div>
        <input style={{ width: '100%' }} placeholder="Attendees (optional, comma-separated)" value={mAttendees} onChange={(e) => setMAttendees(e.target.value)} />
        <textarea
          rows={3}
          style={{ width: '100%', resize: 'vertical' }}
          placeholder={'What was decided? e.g. "We decided to move standups to Mondays only. Owner: head of ops. Trade-off: less mid-week visibility."'}
          value={mOutcome}
          onChange={(e) => setMOutcome(e.target.value)}
        />
        <div>
          <button className="primary" onClick={logOutcome} disabled={busy || !mTitle.trim() || !mOutcome.trim()}>
            {busy ? 'Working…' : 'Capture outcome'}
          </button>
        </div>
      </div>

      <div className="section-title">Upload or paste a meeting transcript</div>
      <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
        ADAMAS summarizes it locally first, then extracts decisions. Text files only (.txt, .md, .vtt, .srt).
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="toolbar" style={{ margin: 0 }}>
          <input style={{ flex: 1, minWidth: 200 }} placeholder="Meeting title (optional)" value={tTitle} onChange={(e) => setTTitle(e.target.value)} />
          <input type="date" value={tDate} onChange={(e) => setTDate(e.target.value)} aria-label="Transcript date" />
          <input ref={fileRef} type="file" accept=".txt,.md,.markdown,.vtt,.srt,.text,text/plain" onChange={onFile} />
        </div>
        <textarea
          rows={5}
          style={{ width: '100%', resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: 13 }}
          placeholder="…or paste the transcript text here."
          value={tText}
          onChange={(e) => setTText(e.target.value)}
        />
        <div>
          <button className="primary" onClick={summarizeTranscript} disabled={busy || !tText.trim()}>
            {busy ? 'Summarizing…' : 'Summarize & extract decisions'}
          </button>
        </div>
      </div>

      {msg && <div className="notice ok" style={{ marginTop: 10 }}>{msg}</div>}
      {summary && (
        <>
          <div className="section-title">Summary (used for extraction)</div>
          <pre className="doc" style={{ maxHeight: 220 }}>{summary}</pre>
        </>
      )}
    </>
  );
}
