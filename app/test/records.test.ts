import { describe, it, expect, afterEach, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { RecordStore } from '../src/records/store.js';
import { validateRecord } from '../src/records/schema.js';
import { computeReadiness } from '../src/obsidian/readiness.js';
import { KnowledgeStore } from '../src/knowledge/store.js';
import { PeopleStore } from '../src/people/store.js';
import { seedVault } from '../src/seed/seed.js';
import { createContext } from '../src/server/context.js';
import { buildApp } from '../src/server/app.js';
import { tempVault } from './helpers.js';

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
});

describe('records schema + store', () => {
  it('validates and rejects', () => {
    const ok = { id: 'REC-001', category: 'customer', title: 'Acme', date: '2026-06-23', summary: 'big account' };
    expect(validateRecord(ok).valid).toBe(true);
    expect(validateRecord({ ...ok, category: 'vendor' }).valid).toBe(false);
    expect(validateRecord({ ...ok, severity: 'critical' }).valid).toBe(false);
  });

  it('creates, filters by category, reports categories, persists, removes', async () => {
    const v = tempVault();
    cleanups.push(v.cleanup);
    const store = await RecordStore.open(path.join(v.root, 'records'));
    await store.create({ category: 'customer', title: 'Acme Foods', summary: 'Top account', amount: 240000, recurring: true });
    await store.create({ category: 'risk', title: 'Single supplier', summary: 'One servo vendor', severity: 'high', mitigation: 'Qualify backup' });
    expect(store.count).toBe(2);
    expect(store.list({ category: 'risk' }).map((r) => r.title)).toEqual(['Single supplier']);
    expect(store.categories().sort()).toEqual(['customer', 'risk']);

    const reopened = await RecordStore.open(path.join(v.root, 'records'));
    expect(reopened.count).toBe(2);
    expect(await reopened.remove('REC-001')).toBe(true);
  });
});

describe('readiness includes diligence records', () => {
  it('rewards breadth across categories', async () => {
    const v = tempVault();
    cleanups.push(v.cleanup);
    const ledger = await seedVault(v.root);
    const knowledge = await KnowledgeStore.open(path.join(v.root, 'knowledge'));
    const people = await PeopleStore.open(path.join(v.root, 'people'));
    const records = await RecordStore.open(path.join(v.root, 'records'));

    const before = computeReadiness(ledger, knowledge, people, records);
    expect(before.components.some((c) => /Diligence records/.test(c.label))).toBe(true);

    await records.create({ category: 'customer', title: 'Acme', summary: 's' });
    await records.create({ category: 'financial', title: 'Margin', summary: 's' });
    await records.create({ category: 'risk', title: 'Key person', summary: 's' });
    await records.create({ category: 'ip', title: 'Trademark', summary: 's' });
    const after = computeReadiness(ledger, knowledge, people, records);
    expect(after.records).toBe(4);
    expect(after.recordCategories).toBe(4);
    expect(after.score).toBeGreaterThan(before.score);
    expect(after.score).toBeLessThanOrEqual(100);
  });
});

describe('records API', () => {
  let app: FastifyInstance;
  let cleanup: () => void;
  beforeAll(async () => {
    const v = tempVault();
    cleanup = v.cleanup;
    app = buildApp(await createContext(v.root));
    await app.ready();
  });
  afterAll(async () => {
    await app.close();
    cleanup();
  });

  it('adds, lists, and deletes a record', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/records',
      payload: { category: 'customer', title: 'Acme Foods', summary: 'Top account', amount: 240000, recurring: true },
    });
    expect(res.statusCode).toBe(201);
    const entry = res.json().entry;
    expect(entry.id).toMatch(/^REC-\d{3,}$/);
    expect(entry.amount).toBe(240000);

    const list = (await app.inject({ method: 'GET', url: '/api/records?category=customer' })).json();
    expect(list.records.length).toBe(1);

    expect((await app.inject({ method: 'DELETE', url: `/api/records/${entry.id}` })).statusCode).toBe(200);
  });

  it('rejects an unknown category', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/records', payload: { category: 'vendor', title: 'x' } });
    expect(res.statusCode).toBe(400);
  });
});
