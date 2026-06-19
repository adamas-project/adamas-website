import { useEffect, useState } from 'react';
import { api } from '../api';

const GROUP_LABEL: Record<string, string> = {
  hiring: 'Hiring & People',
  sales: 'Sales & Revenue',
  product: 'Product & Delivery',
  finance: 'Finance',
  ops: 'Operations',
  'investor-board': 'Investor & Board',
  'whole-ledger': 'Whole-ledger assets',
};
const GROUP_ORDER = ['hiring', 'sales', 'product', 'finance', 'ops', 'investor-board', 'whole-ledger'];

export function AssetsView() {
  const [assets, setAssets] = useState<any[]>([]);
  const [auto, setAuto] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [doc, setDoc] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await api.assets();
    setAssets(r.assets);
    setAuto(r.autoRegenerate);
  }
  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!selected) {
      setDoc(null);
      return;
    }
    api.asset(selected).then((r) => setDoc(r.asset)).catch(() => setDoc(null));
  }, [selected]);

  async function gen(id: string, regen = false) {
    setBusy(true);
    try {
      const r = regen ? await api.regenerate(id) : await api.generate(id);
      setSelected(id);
      setDoc(r.asset);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function toggleAuto() {
    await api.setAutoRegen(!auto);
    await load();
  }

  const byGroup: Record<string, any[]> = {};
  for (const a of assets) (byGroup[a.group] ??= []).push(a);

  return (
    <div className="layout">
      <div className="panel">
        <div className="toolbar">
          <h2 style={{ margin: 0, flex: 1 }}>Asset Registry</h2>
          <label className="rolebox">
            <input type="checkbox" checked={auto} onChange={toggleAuto} /> auto-regenerate
          </label>
        </div>
        <p className="muted">Assets are assembled only from existing ledger decisions, with section-level SRC traceability.</p>
        {GROUP_ORDER.filter((g) => byGroup[g]).map((g) => (
          <div key={g}>
            <div className="group-label">{GROUP_LABEL[g] ?? g}</div>
            <div className="grid-assets">
              {(byGroup[g] ?? []).map((a) => (
                <div key={a.id} className={`asset-card ${selected === a.id ? 'selected' : ''}`}>
                  <div className="title">{a.title}</div>
                  <div className="pill-row">
                    <span className={`badge ${a.kind === 'live' ? 'live' : 'gen'}`}>{a.kind}</span>
                    {a.wholeLedger && <span className="badge">whole-ledger</span>}
                    {a.generated && (a.stale ? <span className="badge stale">stale</span> : <span className="badge live">fresh</span>)}
                  </div>
                  <p className="muted" style={{ fontSize: 13, margin: '4px 0' }}>{a.summary}</p>
                  <div>
                    <button className="primary" disabled={busy} onClick={() => gen(a.id, a.generated)}>
                      {a.generated ? (a.stale ? 'Regenerate' : 'Regenerate') : 'Generate'}
                    </button>{' '}
                    {a.generated && <button className="ghost" onClick={() => setSelected(a.id)}>View</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="panel">
        <h2>Generated asset</h2>
        {!doc && <p className="muted">Generate or select an asset to view its SRC-traced output.</p>}
        {doc && (
          <div>
            <div className="toolbar">
              <strong>{doc.title}</strong>
              {doc.stale ? <span className="badge stale">stale</span> : <span className="badge live">fresh</span>}
              <a href={`/api/assets/${doc.assetId}/markdown`} download={`${doc.assetId}.md`}>download .md</a>
            </div>
            {doc.stale && (
              <div className="notice warn" style={{ marginBottom: 10 }}>
                {doc.staleReason} Affected sections: {doc.staleSections.join(', ') || '—'}.{' '}
                <button onClick={() => gen(doc.assetId, true)}>Regenerate now</button>
              </div>
            )}
            <p className="muted" style={{ fontSize: 13 }}>
              ledger v{doc.header.ledgerVersion} · {doc.header.sourceDecisionCount} source decisions · {new Date(doc.header.generatedAt).toLocaleString()}
            </p>
            <pre className="doc" dangerouslySetInnerHTML={{ __html: highlightSrc(doc.markdown) }} />
          </div>
        )}
      </div>
    </div>
  );
}

function highlightSrc(md: string): string {
  const esc = md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return esc.replace(/(SRC:[^\n]*)/g, '<span class="src">$1</span>');
}
