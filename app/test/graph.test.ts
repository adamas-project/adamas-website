import { describe, it, expect, afterEach } from 'vitest';
import path from 'node:path';
import { seedVault } from '../src/seed/seed.js';
import { KnowledgeStore } from '../src/knowledge/store.js';
import { PeopleStore } from '../src/people/store.js';
import { RecordStore } from '../src/records/store.js';
import { buildMemoryGraph } from '../src/ledger/graph.js';
import { tempVault } from './helpers.js';

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
});

describe('buildMemoryGraph', () => {
  it('combines decisions + knowledge into one hub-linked graph', async () => {
    const v = tempVault();
    cleanups.push(v.cleanup);
    const ledger = await seedVault(v.root);
    const knowledge = await KnowledgeStore.open(path.join(v.root, 'knowledge'));
    await knowledge.create({
      title: 'Holding the margin floor',
      source: 'manual',
      type: 'note',
      summary: 'why margin discipline matters',
      tags: ['margin', 'pricing'],
    });

    const g = buildMemoryGraph(ledger, knowledge);
    const ids = new Set(g.nodes.map((n) => n.id));

    // Both hubs exist and every decision/knowledge node hangs off its hub.
    expect(ids.has('#decisions')).toBe(true);
    expect(ids.has('#knowledge')).toBe(true);
    expect(g.nodes.some((n) => n.kind === 'decision')).toBe(true);
    expect(g.nodes.some((n) => n.kind === 'knowledge')).toBe(true);

    // Decisions hang off department sub-hubs (categories/subcategories), one per decision.
    expect(g.nodes.some((n) => n.kind === 'hub' && n.id.startsWith('#dom:'))).toBe(true);
    const decMembership = g.edges.filter((e) => e.kind === 'hub' && (e.source.startsWith('#dom:') || e.target.startsWith('#dom:')));
    expect(decMembership.length).toBeGreaterThanOrEqual(14); // one per seeded decision

    // Decision↔decision bi-links survive as "link" edges.
    expect(g.edges.some((e) => e.kind === 'link')).toBe(true);

    // The knowledge note cross-links to a decision via its "margin" tag.
    const knEntry = g.nodes.find((n) => n.kind === 'knowledge')!;
    expect(g.edges.some((e) => e.kind === 'cross' && (e.source === knEntry.id || e.target === knEntry.id))).toBe(true);
  });

  it('mirrors the full vault: people + records + their hubs and links', async () => {
    const v = tempVault();
    cleanups.push(v.cleanup);
    const ledger = await seedVault(v.root);
    const knowledge = await KnowledgeStore.open(path.join(v.root, 'knowledge'));
    const people = await PeopleStore.open(path.join(v.root, 'people'));
    const records = await RecordStore.open(path.join(v.root, 'records'));
    // A person whose role owns seeded decisions (the seed uses role "founder").
    await people.create({ name: 'Massimo Sahin', role: 'founder', kind: 'founder', summary: 'Founder bio' });
    await records.create({ category: 'customer', title: 'Acme Foods', summary: 'top account', amount: 240000, recurring: true });
    await records.create({ category: 'risk', title: 'Single supplier', summary: 'one vendor', severity: 'high' });

    const g = buildMemoryGraph(ledger, knowledge, { people, records });
    const ids = new Set(g.nodes.map((n) => n.id));

    // Top-level hubs for every overview.
    expect(ids.has('#people')).toBe(true);
    expect(ids.has('#dataroom')).toBe(true);
    // Record category sub-hubs.
    expect(ids.has('#rec:customer')).toBe(true);
    expect(ids.has('#rec:risk')).toBe(true);
    // Person + record nodes present.
    expect(g.nodes.some((n) => n.kind === 'person')).toBe(true);
    expect(g.nodes.some((n) => n.kind === 'record')).toBe(true);
    // The person owns at least one decision (role match) → a cross edge.
    const person = g.nodes.find((n) => n.kind === 'person')!;
    expect(g.edges.some((e) => e.kind === 'cross' && (e.source === person.id || e.target === person.id))).toBe(true);
  });

  it('emits shared topics as tag nodes in topics mode', async () => {
    const v = tempVault();
    cleanups.push(v.cleanup);
    const ledger = await seedVault(v.root);
    const knowledge = await KnowledgeStore.open(path.join(v.root, 'knowledge'));
    await knowledge.create({ title: 'Margin note A', source: 'manual', type: 'note', summary: 's', tags: ['margin', 'pricing'] });
    await knowledge.create({ title: 'Margin note B', source: 'manual', type: 'note', summary: 's', tags: ['margin'] });

    const g = buildMemoryGraph(ledger, knowledge, { topics: true });
    const tagNode = g.nodes.find((n) => n.kind === 'tag' && n.id === '#tag:margin');
    expect(tagNode).toBeTruthy();
    // The tag connects both knowledge notes (shared) — and any margin decisions.
    const edges = g.edges.filter((e) => e.source === '#tag:margin' || e.target === '#tag:margin');
    expect(edges.length).toBeGreaterThanOrEqual(2);
    // Default mode has no tag nodes.
    expect(buildMemoryGraph(ledger, knowledge).nodes.some((n) => n.kind === 'tag')).toBe(false);
  });

  it('omits the knowledge hub when there is no knowledge', async () => {
    const v = tempVault();
    cleanups.push(v.cleanup);
    const ledger = await seedVault(v.root);
    const g = buildMemoryGraph(ledger);
    expect(g.nodes.some((n) => n.id === '#knowledge')).toBe(false);
    expect(g.nodes.some((n) => n.id === '#decisions')).toBe(true);
  });
});
