import type { Ledger } from '../ledger/ledger.js';
import type { Decision, Domain, Status } from '../schema/decision.schema.js';

/**
 * A declarative selector over the ledger. A section template uses one of these
 * to choose which existing decisions it is assembled from. Nothing is invented;
 * the asset only ever contains decisions the query resolves to.
 */
export interface DecisionQuery {
  /** Whole ledger (used by whole-ledger assets). */
  all?: boolean;
  /** Explicit decision ids (exact selection). */
  ids?: string[];
  domains?: Domain[];
  status?: Status[];
  /** Case-insensitive keyword(s); matches title/decision/context/tradeoffs. */
  match?: string[];
  /** Decisions linked to (or being) any of these ids. */
  linkedTo?: string[];
}

function matchesKeywords(d: Decision, keywords: string[]): boolean {
  const hay = [d.title, d.decision, d.context, ...(d.tradeoffs ?? [])].join(' ').toLowerCase();
  return keywords.some((k) => hay.includes(k.toLowerCase()));
}

/** Resolve a query to a sorted, de-duplicated list of real ledger decisions. */
export function resolveQuery(ledger: Ledger, q: DecisionQuery): Decision[] {
  if (q.ids && q.ids.length) {
    return q.ids
      .map((id) => ledger.get(id))
      .filter((d): d is Decision => Boolean(d))
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  let pool = ledger.list();
  if (q.all) return pool;

  if (q.domains && q.domains.length) pool = pool.filter((d) => q.domains!.includes(d.domain));
  if (q.status && q.status.length) pool = pool.filter((d) => q.status!.includes(d.status ?? 'active'));
  if (q.match && q.match.length) pool = pool.filter((d) => matchesKeywords(d, q.match!));
  if (q.linkedTo && q.linkedTo.length) {
    const set = new Set(q.linkedTo);
    pool = pool.filter(
      (d) => set.has(d.id) || (d.links ?? []).some((l) => set.has(l)),
    );
  }
  return pool.sort((a, b) => a.id.localeCompare(b.id));
}
