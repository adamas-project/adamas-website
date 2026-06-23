import { DOMAINS, type Domain } from '../schema/decision.schema.js';
import type { Ledger } from '../ledger/ledger.js';
import type { KnowledgeStore } from '../knowledge/store.js';
import type { PeopleStore } from '../people/store.js';

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
  components: Array<{ label: string; points: number; max: number }>;
}

export function computeReadiness(ledger: Ledger, knowledge: KnowledgeStore, people?: PeopleStore): Readiness {
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

  const coverage = ((DOMAINS.length - domainGaps.length) / DOMAINS.length) * 25;
  const traceability = (traceabilityPct / 100) * 30;
  const volume = Math.min(total / 20, 1) * 10;
  const knowledgePts = Math.min(knowledge.count / 10, 1) * 10;
  // 25 pts: roster depth (15) + CV coverage (10), with a small floor once any
  // key person is flagged (succession/continuity is documented at all).
  const roster = Math.min(peopleCount / 5, 1) * 15;
  const cvCoverage = peopleCount ? (peopleWithCv / peopleCount) * 10 : 0;
  const teamPts = roster + cvCoverage;

  const components = [
    { label: 'Domain coverage (all 5 areas documented)', points: Math.round(coverage), max: 25 },
    { label: 'Traceability (decisions cite their sources)', points: Math.round(traceability), max: 30 },
    { label: 'Decision volume / depth', points: Math.round(volume), max: 10 },
    { label: 'Knowledge base depth', points: Math.round(knowledgePts), max: 10 },
    { label: 'Team & key-person documentation (CVs on file)', points: Math.round(teamPts), max: 25 },
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
    components,
  };
}
