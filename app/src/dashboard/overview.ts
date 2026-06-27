import type { Ledger } from '../ledger/ledger.js';
import type { KnowledgeStore } from '../knowledge/store.js';
import type { PeopleStore } from '../people/store.js';
import type { RecordStore } from '../records/store.js';
import type { GlossaryStore } from '../glossary/store.js';
import { computeReadiness } from '../obsidian/readiness.js';
import { DOMAINS, type Domain } from '../schema/decision.schema.js';

// One read-only overview that rolls up every store, so an operator who doesn't
// want to add things up by hand sees the headline numbers at a glance.

export interface OverviewDeps {
  ledger: Ledger;
  knowledge: KnowledgeStore;
  people: PeopleStore;
  records: RecordStore;
  glossary: GlossaryStore;
}

export interface Overview {
  counts: { decisions: number; knowledge: number; people: number; records: number; glossary: number };
  decisions: { byDomain: Record<Domain, number>; active: number; superseded: number };
  people: { total: number; keyPeople: number; byKind: Record<string, number> };
  revenue: {
    currency: string;
    arr: number;
    oneOff: number;
    totalContractValue: number;
    customers: number;
    activeCustomers: number;
    atRiskCustomers: number;
    avgContract: number;
    topCustomers: Array<{ id: string; title: string; amount: number; recurring: boolean; status?: string }>;
    byYear: Array<{ year: string; amount: number }>;
  };
  keyMetrics: Array<{ metric: string; period?: string; amount?: number; currency?: string; status?: string }>;
  records: { total: number; byCategory: Record<string, number> };
  risks: { total: number; bySeverity: { low: number; medium: number; high: number } };
  readiness: { score: number; traceabilityPct: number };
}

const num = (n: unknown): number => (typeof n === 'number' && Number.isFinite(n) ? n : 0);

/** Rank a free-form period like "Q2 2025" / "FY2025" / "TTM Jun 2025" for "latest". */
function periodRank(p = ''): number {
  const ym = p.match(/(20\d{2})/);
  const year = ym ? Number(ym[1]) : 0;
  const qm = p.match(/Q([1-4])/i);
  const q = qm ? Number(qm[1]) : /FY/i.test(p) ? 4 : 2;
  return year * 10 + q;
}

export function computeOverview(deps: OverviewDeps): Overview {
  const decisions = deps.ledger.list();
  const people = deps.people.list();
  const records = deps.records.list();

  // Decisions by domain + status.
  const byDomain = Object.fromEntries(DOMAINS.map((d) => [d, 0])) as Record<Domain, number>;
  let superseded = 0;
  for (const d of decisions) {
    byDomain[d.domain] += 1;
    if ((d.status ?? 'active') !== 'active') superseded += 1;
  }

  // People by kind.
  const byKind: Record<string, number> = {};
  let keyPeople = 0;
  for (const p of people) {
    byKind[p.kind] = (byKind[p.kind] ?? 0) + 1;
    if (p.keyPerson) keyPeople += 1;
  }

  // Records by category.
  const byCategory: Record<string, number> = {};
  for (const r of records) byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;

  // Revenue (from customer records: amount = ARR / contract value).
  const customers = records.filter((r) => r.category === 'customer');
  const arr = customers.filter((c) => c.recurring).reduce((s, c) => s + num(c.amount), 0);
  const oneOff = customers.filter((c) => !c.recurring).reduce((s, c) => s + num(c.amount), 0);
  const totalContractValue = arr + oneOff;
  const currency = customers.find((c) => c.currency)?.currency ?? '€';
  const activeCustomers = customers.filter((c) => c.status === 'active').length;
  const atRiskCustomers = customers.filter((c) => c.status === 'at-risk').length;
  const avgContract = customers.length ? Math.round(totalContractValue / customers.length) : 0;
  const topCustomers = [...customers]
    .sort((a, b) => num(b.amount) - num(a.amount))
    .slice(0, 5)
    .map((c) => ({ id: c.id, title: c.title, amount: num(c.amount), recurring: !!c.recurring, status: c.status }));

  // Contract value grouped by renewal year (from dueDate).
  const yearMap = new Map<string, number>();
  for (const c of customers) {
    const y = (c.dueDate ?? '').slice(0, 4);
    if (/^\d{4}$/.test(y)) yearMap.set(y, (yearMap.get(y) ?? 0) + num(c.amount));
  }
  const byYear = [...yearMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([year, amount]) => ({ year, amount }));

  // Latest value per financial KPI metric.
  const financial = records.filter((r) => r.category === 'financial' && r.metric);
  const latestByMetric = new Map<string, (typeof financial)[number]>();
  for (const r of financial) {
    const cur = latestByMetric.get(r.metric!);
    if (!cur || periodRank(r.period) >= periodRank(cur.period)) latestByMetric.set(r.metric!, r);
  }
  const keyMetrics = [...latestByMetric.values()]
    .sort((a, b) => a.metric!.localeCompare(b.metric!))
    .map((r) => ({ metric: r.metric!, period: r.period, amount: r.amount, currency: r.currency, status: r.status }));

  // Risk register by severity.
  const risks = records.filter((r) => r.category === 'risk');
  const bySeverity = { low: 0, medium: 0, high: 0 };
  for (const r of risks) if (r.severity) bySeverity[r.severity] += 1;

  const readiness = computeReadiness(deps.ledger, deps.knowledge, deps.people, deps.records);

  return {
    counts: {
      decisions: deps.ledger.count,
      knowledge: deps.knowledge.count,
      people: deps.people.count,
      records: deps.records.count,
      glossary: deps.glossary.count,
    },
    decisions: { byDomain, active: decisions.length - superseded, superseded },
    people: { total: people.length, keyPeople, byKind },
    revenue: {
      currency,
      arr,
      oneOff,
      totalContractValue,
      customers: customers.length,
      activeCustomers,
      atRiskCustomers,
      avgContract,
      topCustomers,
      byYear,
    },
    keyMetrics,
    records: { total: records.length, byCategory },
    risks: { total: risks.length, bySeverity },
    readiness: { score: readiness.score, traceabilityPct: readiness.traceabilityPct },
  };
}
