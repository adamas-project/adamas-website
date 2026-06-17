import type { Decision } from '../api';
import { domainVar } from '../tokens';

// Shared decision detail panel, used by both the Ledger and the Decision Graph
// so clicking a graph node opens the same detail view.
export function DecisionDetail({
  data,
  onNavigate,
  onSupersede,
}: {
  data: { decision: Decision; neighbors: string[] };
  onNavigate: (id: string) => void;
  onSupersede?: (id: string) => void;
}) {
  const d = data.decision;
  return (
    <div>
      <div className="id mono">{d.id}</div>
      <h2 style={{ marginTop: 4 }}>{d.title}</h2>
      <dl className="kv">
        <dt>Domain</dt>
        <dd><span className="dot" style={{ color: domainVar(d.domain), background: domainVar(d.domain) }} />{d.domain}</dd>
        <dt>Date</dt><dd>{d.date}</dd>
        <dt>Status</dt>
        <dd>
          {d.status ?? 'active'}
          {d.superseded_by ? (
            <> → <button className="linkbtn" onClick={() => onNavigate(d.superseded_by!)}>{d.superseded_by}</button></>
          ) : null}
        </dd>
        <dt>Owner</dt><dd>{d.owner.role}{d.owner.name ? ` (${d.owner.name})` : ''}</dd>
        <dt>Dissent</dt>
        <dd>{d.owner.dissent?.length ? d.owner.dissent.join(', ') : <span className="muted">none recorded</span>}</dd>
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

      {onSupersede && d.status === 'active' && (
        <div style={{ marginTop: 16 }}>
          <button onClick={() => onSupersede(d.id)}>Supersede this decision…</button>
        </div>
      )}
    </div>
  );
}
