import { describe, it, expect, afterEach } from 'vitest';
import path from 'node:path';
import { Ledger } from '../src/ledger/ledger.js';
import { KnowledgeStore } from '../src/knowledge/store.js';
import { PeopleStore } from '../src/people/store.js';
import { RecordStore } from '../src/records/store.js';
import { GlossaryStore } from '../src/glossary/store.js';
import { buildMemoryGraph } from '../src/ledger/graph.js';
import { computeOverview } from '../src/dashboard/overview.js';
import { seedDemo } from '../src/demo/demo.js';
import { tempVault } from './helpers.js';

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
});

async function open(root: string) {
  return {
    ledger: await Ledger.open(root),
    knowledge: await KnowledgeStore.open(path.join(root, 'knowledge')),
    people: await PeopleStore.open(path.join(root, 'people')),
    records: await RecordStore.open(path.join(root, 'records')),
    glossary: await GlossaryStore.open(path.join(root, 'glossary')),
  };
}

describe('demo seeder', () => {
  it('fills every category at ~10x scale and is idempotent', async () => {
    const v = tempVault();
    cleanups.push(v.cleanup);
    const deps = await open(v.root);

    const r = await seedDemo(v.root, deps);
    expect(r.decisions).toBeGreaterThanOrEqual(1000);
    expect(r.knowledge).toBeGreaterThanOrEqual(900);
    expect(r.people).toBeGreaterThanOrEqual(1000);
    expect(r.records).toBeGreaterThanOrEqual(1200);

    expect(deps.ledger.count).toBeGreaterThanOrEqual(1000);
    expect(deps.knowledge.count).toBeGreaterThanOrEqual(900);
    expect(deps.people.count).toBeGreaterThanOrEqual(1000);
    expect(deps.records.count).toBeGreaterThanOrEqual(1200);
    expect(deps.glossary.count).toBeGreaterThanOrEqual(400);

    // The demo "team" is fictional by default — no real famous names appear
    // (personality-rights safe). The real FAMOUS_NAMES roster is a dev-only
    // opt-in via ADAMAS_DEMO_FAMOUS=1.
    const names = deps.people.list().map((p) => p.name);
    expect(names).not.toContain('Pablo Escobar');
    expect(names).not.toContain('Steve Jobs');
    expect(names).not.toContain('Massimo Sahin');
    // Decisions reference the renamed (fictional) owners, keeping people↔decision links intact.
    expect(deps.ledger.list().some((d) => d.owner.name === 'Marcus Halvorsen')).toBe(true);
    // Exactly one key person — the fictional founder.
    const keyPeople = deps.people.list().filter((p) => p.keyPerson);
    expect(keyPeople.length).toBe(1);
    expect(keyPeople[0]!.name).toBe('Marcus Halvorsen');
    expect(keyPeople[0]!.kind).toBe('founder');

    // For-fun: thousands of customers and a book of business in the trillions.
    const overview = computeOverview(deps);
    expect(overview.revenue.customers).toBeGreaterThanOrEqual(1500);
    expect(overview.revenue.totalContractValue).toBeGreaterThan(5_000_000_000_000); // > $5T
    expect(overview.revenue.currency).toBe('$');

    // All four record categories are represented.
    expect(deps.records.categories().sort()).toEqual(['customer', 'financial', 'ip', 'risk']);

    // The combined graph wires people to the decisions they own + record hubs.
    const g = buildMemoryGraph(deps.ledger, deps.knowledge, { people: deps.people, records: deps.records });
    expect(g.nodes.some((n) => n.kind === 'person')).toBe(true);
    expect(g.nodes.some((n) => n.kind === 'record')).toBe(true);
    expect(g.edges.some((e) => e.kind === 'cross')).toBe(true);

    // Second run adds nothing (entry-level idempotent) and never duplicates.
    const before = deps.ledger.count;
    const again = await seedDemo(v.root, deps);
    expect(again.noop).toBe(true);
    expect(again.decisions).toBe(0);
    expect(deps.ledger.count).toBe(before);
  }, 180_000);
});
