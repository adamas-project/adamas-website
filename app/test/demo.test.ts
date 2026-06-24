import { describe, it, expect, afterEach } from 'vitest';
import path from 'node:path';
import { Ledger } from '../src/ledger/ledger.js';
import { KnowledgeStore } from '../src/knowledge/store.js';
import { PeopleStore } from '../src/people/store.js';
import { RecordStore } from '../src/records/store.js';
import { buildMemoryGraph } from '../src/ledger/graph.js';
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
  };
}

describe('demo seeder', () => {
  it('fills every category with 20+ entries and is idempotent', async () => {
    const v = tempVault();
    cleanups.push(v.cleanup);
    const deps = await open(v.root);

    const r = await seedDemo(v.root, deps);
    expect(r.decisions).toBeGreaterThanOrEqual(20);
    expect(r.knowledge).toBeGreaterThanOrEqual(20);
    expect(r.people).toBeGreaterThanOrEqual(20);
    expect(r.records).toBeGreaterThanOrEqual(20);

    expect(deps.ledger.count).toBeGreaterThanOrEqual(20);
    expect(deps.knowledge.count).toBeGreaterThanOrEqual(20);
    expect(deps.people.count).toBeGreaterThanOrEqual(20);
    expect(deps.records.count).toBeGreaterThanOrEqual(20);

    // All four record categories are represented.
    expect(deps.records.categories().sort()).toEqual(['customer', 'financial', 'ip', 'risk']);

    // The combined graph wires people to the decisions they own + record hubs.
    const g = buildMemoryGraph(deps.ledger, deps.knowledge, { people: deps.people, records: deps.records });
    expect(g.nodes.some((n) => n.kind === 'person')).toBe(true);
    expect(g.nodes.some((n) => n.kind === 'record')).toBe(true);
    expect(g.edges.some((e) => e.kind === 'cross')).toBe(true);

    // Second run is a no-op (marker file).
    const again = await seedDemo(v.root, deps);
    expect(again.alreadySeeded).toBe(true);
    expect(deps.ledger.count).toBeGreaterThanOrEqual(20); // unchanged, not doubled
  });
});
