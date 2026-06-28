import { describe, it, expect, afterEach } from 'vitest';
import path from 'node:path';
import { Ledger } from '../src/ledger/ledger.js';
import { KnowledgeStore } from '../src/knowledge/store.js';
import { PeopleStore } from '../src/people/store.js';
import { RecordStore } from '../src/records/store.js';
import { GlossaryStore } from '../src/glossary/store.js';
import { computeOverview } from '../src/dashboard/overview.js';
import { tempVault } from './helpers.js';

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
});

describe('dashboard overview', () => {
  it('rolls up counts, revenue and risk from the stores', async () => {
    const v = tempVault();
    cleanups.push(v.cleanup);
    const ledger = await Ledger.open(v.root);
    const knowledge = await KnowledgeStore.open(path.join(v.root, 'knowledge'));
    const people = await PeopleStore.open(path.join(v.root, 'people'));
    const records = await RecordStore.open(path.join(v.root, 'records'));
    const glossary = await GlossaryStore.open(path.join(v.root, 'glossary'));

    await ledger.create({ domain: 'sales', date: '2025-01-01', title: 'A sales call', context: 'c', decision: 'd', owner: { role: 'head-of-sales', name: 'X' } });
    await knowledge.create({ title: 'Note', source: 'manual', type: 'note', summary: 's' });
    await people.create({ name: 'Founder', role: 'founder', kind: 'founder', summary: 'bio', keyPerson: true, startDate: '2019-01' });
    await people.create({ name: 'Worker', role: 'engineer', kind: 'employee', summary: 'bio', startDate: '2021-06' });
    await records.create({ category: 'customer', title: 'Big Co', summary: 's', amount: 100000, currency: '€', recurring: true, status: 'active', dueDate: '2026-03-01' });
    await records.create({ category: 'customer', title: 'Small Co', summary: 's', amount: 50000, currency: '€', recurring: false, status: 'at-risk', dueDate: '2026-06-01' });
    await records.create({ category: 'financial', title: 'GM', summary: 's', metric: 'Gross margin', period: 'Q2 2025', amount: 27 });
    await records.create({ category: 'risk', title: 'A risk', summary: 's', severity: 'high' });
    await glossary.create({ term: 'ARR', definition: 'Annual Recurring Revenue.' });

    const o = computeOverview({ ledger, knowledge, people, records, glossary });

    expect(o.counts).toEqual({ decisions: 1, knowledge: 1, people: 2, records: 4, glossary: 1 });
    expect(o.people.keyPeople).toBe(1);
    expect(o.revenue.arr).toBe(100000); // recurring only
    expect(o.revenue.oneOff).toBe(50000);
    expect(o.revenue.totalContractValue).toBe(150000);
    expect(o.revenue.customers).toBe(2);
    expect(o.revenue.activeCustomers).toBe(1);
    expect(o.revenue.atRiskCustomers).toBe(1);
    expect(o.revenue.avgContract).toBe(75000);
    expect(o.revenue.byYear).toEqual([{ year: '2026', amount: 150000 }]);
    expect(o.revenue.topCustomers[0]!.title).toBe('Big Co');
    expect(o.keyMetrics).toHaveLength(1);
    expect(o.keyMetrics[0]!.metric).toBe('Gross margin');
    expect(o.risks.bySeverity.high).toBe(1);
    expect(o.decisions.byDomain.sales).toBe(1);
    expect(o.readiness.score).toBeGreaterThanOrEqual(0);
    // Cumulative headcount trend from startDate years.
    expect(o.trends.headcountByYear).toEqual([{ year: '2019', count: 1 }, { year: '2021', count: 2 }]);
  });
});
