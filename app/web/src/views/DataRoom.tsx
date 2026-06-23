import { useEffect, useState } from 'react';
import { api } from '../api';
import { useLang } from '../i18n';

const CATEGORIES: Array<{ id: string; label: string }> = [
  { id: 'customer', label: 'Customers & contracts' },
  { id: 'financial', label: 'Financial KPIs' },
  { id: 'risk', label: 'Risk register' },
  { id: 'ip', label: 'IP & assets' },
];

export function DataRoomView() {
  const { t } = useLang();
  const [info, setInfo] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function load() {
    try {
      setInfo(await api.obsidian());
    } catch (e) {
      setMsg((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function exportVault() {
    setBusy(true);
    setMsg('');
    try {
      const r = await api.obsidianExport();
      setMsg(`Exported ${r.files} files (${r.decisions} decisions, ${r.knowledge} knowledge) to ${r.path}`);
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function importInbox() {
    setBusy(true);
    setMsg('');
    try {
      const r = await api.obsidianImport();
      setMsg(r.imported ? `Imported ${r.imported} note(s) from _Inbox: ${r.titles.join(', ')}` : 'No new notes in _Inbox.');
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const r = info?.readiness;
  const score = r?.score ?? 0;
  const scoreColor = score >= 70 ? 'var(--ok)' : score >= 40 ? 'var(--warn)' : 'var(--danger)';

  return (
    <div className="layout">
      <RecordsManager onChanged={load} />
      <div className="panel">
        <h2>{t('Data Room — valuation readiness')}</h2>
        <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
          A diligence-ready view of the vault: how complete and traceable your decision record is. Higher = lower
          perceived risk in an M&A / fundraise evaluation.
        </p>
        {r && (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, margin: '8px 0 14px' }}>
              <div style={{ fontSize: 44, fontWeight: 800, color: scoreColor, letterSpacing: '-0.02em' }}>{score}</div>
              <div className="muted">/ 100 readiness · {r.decisions} decisions · {r.knowledge} knowledge · {r.traceabilityPct}% sourced</div>
            </div>
            <table>
              <thead><tr><th>Component</th><th>Score</th></tr></thead>
              <tbody>
                {r.components.map((c: any, i: number) => (
                  <tr key={i}><td>{c.label}</td><td>{c.points} / {c.max}</td></tr>
                ))}
              </tbody>
            </table>
            {r.domainGaps?.length > 0 && (
              <div className="notice warn" style={{ marginTop: 12 }}>
                Coverage gap: no decisions yet in {r.domainGaps.join(', ')}. Capturing a few there raises the score.
              </div>
            )}
          </>
        )}
      </div>

      <div className="panel">
        <h2>{t('Obsidian vault')}</h2>
        <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
          ADAMAS stays the source of truth; this generates a clean **Obsidian** data-room vault (YAML frontmatter,
          <span className="mono"> [[wikilinks]]</span>, MOC indexes) — your durable “second brain.”
        </p>
        <div className="toolbar">
          <button className="primary" onClick={exportVault} disabled={busy}>
            {busy ? t('Generating…') : t('Generate / refresh Obsidian vault')}
          </button>
          {info?.exists ? <span className="badge live">{t('built')}</span> : <span className="badge">{t('not built yet')}</span>}
          {info?.auto && <span className="badge live">{t('auto-sync on')}</span>}
          <button onClick={importInbox} disabled={busy} title="Import notes you wrote into obsidian/_Inbox/">
            {t('Import from _Inbox')}
          </button>
        </div>
        {info?.auto && (
          <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
            The vault refreshes automatically whenever a decision or knowledge entry changes — you rarely need this
            button. Use it to force an immediate rebuild.
          </p>
        )}
        {msg && <div className="notice ok">{msg}</div>}

        {info?.dir && (
          <>
            <div className="section-title">Vault location</div>
            <p className="mono" style={{ fontSize: 13 }}>{info.dir}</p>
            <div className="section-title">Open in Obsidian</div>
            <ol className="muted" style={{ fontSize: 13, lineHeight: 1.7 }}>
              <li>In Docker, this is the host folder mapped to <span className="mono">/data/obsidian</span> (e.g. <span className="mono">app/obsidian</span>).</li>
              <li>Obsidian → <em>Open folder as vault</em> → choose that folder.</li>
              <li>Open <span className="mono">00 - Index.md</span> — that’s the cockpit MOC.</li>
            </ol>
            <p className="muted" style={{ fontSize: 13 }}>
              Decisions are read-only here (governed in ADAMAS); use the vault for browsing, the graph, and the living
              knowledge base. Re-run the export to refresh after changes.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function RecordsManager({ onChanged }: { onChanged: () => void }) {
  const { t } = useLang();
  const [records, setRecords] = useState<any[]>([]);
  const [category, setCategory] = useState('customer');
  const [form, setForm] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function load() {
    try {
      setRecords((await api.records()).records);
    } catch (e) {
      setMsg((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  async function add() {
    if (!form.title?.trim()) {
      setMsg('Title is required.');
      return;
    }
    setBusy(true);
    setMsg('');
    try {
      await api.addRecord({ ...form, category });
      setForm({});
      setMsg('Added.');
      await load();
      onChanged();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    await api.deleteRecord(id);
    await load();
    onChanged();
  }

  return (
    <div className="panel" style={{ gridColumn: '1 / -1' }}>
      <h2 style={{ marginTop: 0 }}>{t('Diligence records')}</h2>
      <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
        The commercial, financial, risk and IP facts a buyer underwrites. Each category you fill in raises the
        valuation-readiness score and appears in the Obsidian data room.
      </p>
      <div className="toolbar" style={{ flexWrap: 'wrap' }}>
        {CATEGORIES.map((c) => (
          <button key={c.id} className={category === c.id ? 'primary' : ''} onClick={() => setCategory(c.id)}>{t(c.label)}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
        <input placeholder="Title *" value={form.title ?? ''} onChange={(e) => set('title', e.target.value)} />
        <input placeholder="Owner (role or name)" value={form.owner ?? ''} onChange={(e) => set('owner', e.target.value)} />
        {category === 'customer' && (
          <>
            <input placeholder="ARR / contract value" value={form.amount ?? ''} onChange={(e) => set('amount', e.target.value)} />
            <input placeholder="Renewal date (YYYY-MM-DD)" value={form.dueDate ?? ''} onChange={(e) => set('dueDate', e.target.value)} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={!!form.recurring} onChange={(e) => set('recurring', e.target.checked)} /> recurring revenue
            </label>
          </>
        )}
        {category === 'financial' && (
          <>
            <input placeholder="Metric (e.g. Gross margin)" value={form.metric ?? ''} onChange={(e) => set('metric', e.target.value)} />
            <input placeholder="Value (e.g. 62%)" value={form.amount ?? ''} onChange={(e) => set('amount', e.target.value)} />
            <input placeholder="Period (e.g. FY2025)" value={form.period ?? ''} onChange={(e) => set('period', e.target.value)} />
          </>
        )}
        {category === 'risk' && (
          <>
            <select value={form.severity ?? ''} onChange={(e) => set('severity', e.target.value)}>
              <option value="">severity…</option>
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
            <input placeholder="Mitigation" value={form.mitigation ?? ''} onChange={(e) => set('mitigation', e.target.value)} />
          </>
        )}
        {category === 'ip' && (
          <input placeholder="Expiry / renewal date" value={form.dueDate ?? ''} onChange={(e) => set('dueDate', e.target.value)} />
        )}
        <input placeholder="Status" value={form.status ?? ''} onChange={(e) => set('status', e.target.value)} />
        <input placeholder="Source (where this is evidenced)" value={form.source ?? ''} onChange={(e) => set('source', e.target.value)} />
      </div>
      <textarea
        style={{ marginTop: 8 }}
        rows={2}
        placeholder="Description / notes"
        value={form.summary ?? ''}
        onChange={(e) => set('summary', e.target.value)}
      />
      <div className="toolbar" style={{ marginTop: 8 }}>
        <button className="primary" onClick={add} disabled={busy}>{busy ? 'Adding…' : `Add ${CATEGORIES.find((c) => c.id === category)?.label}`}</button>
        {msg && <span className="muted" style={{ fontSize: 13 }}>{msg}</span>}
      </div>

      {CATEGORIES.map((c) => {
        const inCat = records.filter((r) => r.category === c.id);
        if (!inCat.length) return null;
        return (
          <div key={c.id} style={{ marginTop: 12 }}>
            <div className="section-title">{t(c.label)} ({inCat.length})</div>
            {inCat.map((r) => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '4px 0' }}>
                <strong>{r.title}</strong>
                {r.status && <span className="badge">{r.status}</span>}
                {r.severity && <span className="badge">{r.severity}</span>}
                {r.amount != null && <span className="muted" style={{ fontSize: 13 }}>{r.currency ?? ''}{Number(r.amount).toLocaleString()}{r.recurring ? '/yr' : ''}</span>}
                <span style={{ flex: 1 }} />
                <button className="tag linkbtn" onClick={() => remove(r.id)}>remove</button>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
