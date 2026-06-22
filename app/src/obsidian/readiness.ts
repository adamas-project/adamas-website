import { DOMAINS, type Domain } from '../schema/decision.schema.js';
import type { Ledger } from '../ledger/ledger.js';
import type { KnowledgeStore } from '../knowledge/store.js';

// A simple, explainable "M&A / valuation readiness" scorecard. The things that
// make a scale-up evaluate higher in diligence: domain coverage, traceable
// sourcing, recorded dissent/ownership, active management of decisions, and a
// living knowledge base — all of which ADAMAS already captures.
export interface Readiness {
  score: number;
  decisions: number;
  knowledge: number;
  byDomain: Record<Domain, number>;
  traceabilityPct: number;
  withSources: number;
  withDissent: number;
  superseded: number;
  domainGaps: Domain[];
  components: Array<{ label: string; points: number; max: number }>;
}

export function computeReadiness(ledger: Ledger, knowledge: KnowledgeStore): Readiness {
  const all = ledger.list();
  const total = all.length;
  const byDomain = Object.fromEntries(DOMAINS.map((d) => [d, 0])) as Record<Domain, number>;
  let withSources = 0;
  let withDissent = 0;
  let superseded = 0;
  for (const d of all) {
    byDomain[d.domain] += 1;
    if ((d.sources ?? []).length > 0) withSources += 1;
    if ((d.owner.dissent ?? []).length > 0) withDissent += 1;
    if ((d.status ?? 'active') !== 'active') superseded += 1;
  }
  const domainGaps = DOMAINS.filter((d) => byDomain[d] === 0);
  const traceabilityPct = total ? Math.round((withSources / total) * 100) : 0;

  const coverage = ((DOMAINS.length - domainGaps.length) / DOMAINS.length) * 30;
  const traceability = (traceabilityPct / 100) * 40;
  const volume = Math.min(total / 20, 1) * 15;
  const knowledgePts = Math.min(knowledge.count / 10, 1) * 15;

  const components = [
    { label: 'Domain coverage (all 5 areas documented)', points: Math.round(coverage), max: 30 },
    { label: 'Traceability (decisions cite their sources)', points: Math.round(traceability), max: 40 },
    { label: 'Decision volume / depth', points: Math.round(volume), max: 15 },
    { label: 'Knowledge base depth', points: Math.round(knowledgePts), max: 15 },
  ];
  const score = components.reduce((n, c) => n + c.points, 0);

  return {
    score,
    decisions: total,
    knowledge: knowledge.count,
    byDomain,
    traceabilityPct,
    withSources,
    withDissent,
    superseded,
    domainGaps,
    components,
  };
}
