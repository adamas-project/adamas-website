import type { Decision } from '../api';
import { domainVar } from '../tokens';
import { useLang } from '../i18n';

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
  const { t } = useLang();
  const d = data.decision;
  return (
    <div>
      <div className="id mono">{d.id}</div>
      <h2 style={{ marginTop: 4 }}>{d.title}</h2>
      <dl className="kv">
        <dt>{t('Domain')}</dt>
        <dd><span className="dot" style={{ color: domainVar(d.domain), background: domainVar(d.domain) }} />{d.domain}</dd>
        <dt>{t('Date')}</dt><dd>{d.date}</dd>
        <dt>{t('Status')}</dt>
        <dd>
          {t(d.status ?? 'active')}
          {d.superseded_by ? (
            <> → <button className="linkbtn" onClick={() => onNavigate(d.superseded_by!)}>{d.superseded_by}</button></>
          ) : null}
        </dd>
        <dt>{t('Owner')}</dt><dd>{d.owner.role}{d.owner.name ? ` (${d.owner.name})` : ''}</dd>
        <dt>{t('Dissent')}</dt>
        <dd>{d.owner.dissent?.length ? d.owner.dissent.join(', ') : <span className="muted">{t('none recorded')}</span>}</dd>
      </dl>

      <div className="section-title">{t('Context (the why)')}</div>
      <p>{d.context}</p>
      <div className="section-title">{t('Decision')}</div>
      <p>{d.decision}</p>

      {d.tradeoffs?.length ? (
        <>
          <div className="section-title">{t('Trade-offs')}</div>
          <ul>{d.tradeoffs.map((tr, i) => <li key={i}>{tr}</li>)}</ul>
        </>
      ) : null}

      <div className="section-title">{t('Links (bi-directional)')}</div>
      <div className="pill-row">
        {(d.links ?? []).length
          ? d.links!.map((l) => <button key={l} className="tag linkbtn" onClick={() => onNavigate(l)}>{l}</button>)
          : <span className="muted">{t('none')}</span>}
      </div>

      <div className="section-title">{t('Sources (traceable)')}</div>
      <div className="pill-row">
        {(d.sources ?? []).length
          ? d.sources!.map((s) => <span key={s} className="tag mono">{s}</span>)
          : <span className="muted">{t('none')}</span>}
      </div>

      {onSupersede && d.status === 'active' && (
        <div style={{ marginTop: 16 }}>
          <button onClick={() => onSupersede(d.id)}>{t('Supersede this decision…')}</button>
        </div>
      )}
    </div>
  );
}
