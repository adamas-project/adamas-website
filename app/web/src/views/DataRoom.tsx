import { useEffect, useState } from 'react';
import { api } from '../api';

export function DataRoomView() {
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

  const r = info?.readiness;
  const score = r?.score ?? 0;
  const scoreColor = score >= 70 ? 'var(--ok)' : score >= 40 ? 'var(--warn)' : 'var(--danger)';

  return (
    <div className="layout">
      <div className="panel">
        <h2>Data Room — valuation readiness</h2>
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
        <h2>Obsidian vault</h2>
        <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
          ADAMAS stays the source of truth; this generates a clean **Obsidian** data-room vault (YAML frontmatter,
          <span className="mono"> [[wikilinks]]</span>, MOC indexes) — your durable “second brain.”
        </p>
        <div className="toolbar">
          <button className="primary" onClick={exportVault} disabled={busy}>
            {busy ? 'Generating…' : 'Generate / refresh Obsidian vault'}
          </button>
          {info?.exists ? <span className="badge live">built</span> : <span className="badge">not built yet</span>}
          {info?.auto && <span className="badge live">auto-sync on</span>}
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
