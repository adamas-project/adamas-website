import { DOMAINS, type Domain } from '../schema/decision.schema.js';
import type { Ledger } from '../ledger/ledger.js';
import type { KnowledgeStore } from '../knowledge/store.js';
import type { PeopleStore } from '../people/store.js';
import type { RecordStore } from '../records/store.js';
import { RECORD_CATEGORIES } from '../records/schema.js';

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
  people: number;
  peopleWithCv: number;
  keyPeople: number;
  records: number;
  recordCategories: number;
  components: Array<{ label: string; points: number; max: number }>;
}

export function computeReadiness(
  ledger: Ledger,
  knowledge: KnowledgeStore,
  people?: PeopleStore,
  records?: RecordStore,
): Readiness {
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

  // Team / key-person documentation — a major diligence factor.
  const peopleList = people?.list() ?? [];
  const peopleCount = peopleList.length;
  const peopleWithCv = peopleList.filter((p) => (p.summary ?? '').trim().length > 40).length;
  const keyPeople = peopleList.filter((p) => p.keyPerson).length;

  // Diligence records: commercial / financial / risk / IP coverage.
  const recCount = records?.count ?? 0;
  const recCategories = records?.categories().length ?? 0;

  const coverage = ((DOMAINS.length - domainGaps.length) / DOMAINS.length) * 20;
  const traceability = (traceabilityPct / 100) * 25;
  const volume = Math.min(total / 20, 1) * 10;
  const knowledgePts = Math.min(knowledge.count / 10, 1) * 10;
  // 15 pts: roster depth (9) + CV coverage (6).
  const roster = Math.min(peopleCount / 5, 1) * 9;
  const cvCoverage = peopleCount ? (peopleWithCv / peopleCount) * 6 : 0;
  const teamPts = roster + cvCoverage;
  // 20 pts: breadth across the 4 diligence categories (customers/financials/risk/IP).
  const dataRoomPts = (recCategories / RECORD_CATEGORIES.length) * 20;

  const components = [
    { label: 'Domain coverage (all 5 areas documented)', points: Math.round(coverage), max: 20 },
    { label: 'Traceability (decisions cite their sources)', points: Math.round(traceability), max: 25 },
    { label: 'Decision volume / depth', points: Math.round(volume), max: 10 },
    { label: 'Knowledge base depth', points: Math.round(knowledgePts), max: 10 },
    { label: 'Team & key-person documentation (CVs on file)', points: Math.round(teamPts), max: 15 },
    { label: 'Diligence records (customers, financials, risk, IP)', points: Math.round(dataRoomPts), max: 20 },
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
    people: peopleCount,
    peopleWithCv,
    keyPeople,
    records: recCount,
    recordCategories: recCategories,
    components,
  };
}
