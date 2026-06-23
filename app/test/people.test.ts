import { describe, it, expect, afterEach, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { PeopleStore } from '../src/people/store.js';
import { validatePerson } from '../src/people/schema.js';
import { computeReadiness } from '../src/obsidian/readiness.js';
import { KnowledgeStore } from '../src/knowledge/store.js';
import { seedVault } from '../src/seed/seed.js';
import { createContext } from '../src/server/context.js';
import { buildApp } from '../src/server/app.js';
import { tempVault } from './helpers.js';

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
});

describe('people schema + store', () => {
  it('validates and rejects entries', () => {
    const ok = { id: 'PER-001', name: 'Jane', role: 'CTO', kind: 'founder', date: '2026-06-23', summary: 'bio' };
    expect(validatePerson(ok).valid).toBe(true);
    expect(validatePerson({ ...ok, kind: 'ceo' }).valid).toBe(false);
    expect(validatePerson({ ...ok, id: 'X-1' }).valid).toBe(false);
  });

  it('creates, lists, filters, persists, and removes', async () => {
    const v = tempVault();
    cleanups.push(v.cleanup);
    const store = await PeopleStore.open(path.join(v.root, 'people'));
    const a = await store.create({ name: 'Jane Doe', role: 'CTO', kind: 'founder', summary: 'Builds things', keyPerson: true });
    await store.create({ name: 'Sam Lee', role: 'Sales Lead', kind: 'employee', summary: 'Closes deals' });
    expect(a.id).toBe('PER-001');
    expect(store.count).toBe(2);
    expect(store.list({ kind: 'founder' }).map((p) => p.name)).toEqual(['Jane Doe']);

    const reopened = await PeopleStore.open(path.join(v.root, 'people'));
    expect(reopened.count).toBe(2);
    expect(await reopened.remove('PER-001')).toBe(true);
    expect(reopened.get('PER-001')).toBeUndefined();
  });
});

describe('readiness includes the team component', () => {
  it('rewards documented people with CVs', async () => {
    const v = tempVault();
    cleanups.push(v.cleanup);
    const ledger = await seedVault(v.root);
    const knowledge = await KnowledgeStore.open(path.join(v.root, 'knowledge'));
    const people = await PeopleStore.open(path.join(v.root, 'people'));

    const before = computeReadiness(ledger, knowledge, people);
    expect(before.components.some((c) => /Team/.test(c.label))).toBe(true);

    await people.create({ name: 'Jane', role: 'CTO', kind: 'founder', summary: 'A long enough bio to count as a real CV summary entry.', keyPerson: true });
    const after = computeReadiness(ledger, knowledge, people);
    expect(after.people).toBe(1);
    expect(after.keyPeople).toBe(1);
    expect(after.score).toBeGreaterThan(before.score);
    expect(after.score).toBeLessThanOrEqual(100);
  });
});

describe('people API', () => {
  let app: FastifyInstance;
  let cleanup: () => void;
  beforeAll(async () => {
    const v = tempVault();
    cleanup = v.cleanup;
    const ctx = await createContext(v.root);
    app = buildApp(ctx);
    await app.ready();
  });
  afterAll(async () => {
    await app.close();
    cleanup();
  });

  it('adds a person and summarizes a pasted CV into bio/skills', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/people',
      payload: {
        name: 'Alex Kim',
        role: 'Head of Engineering',
        kind: 'employee',
        cv: 'Alex Kim is a senior engineer. Led the controls platform migration and built the automation testing pipeline. Expert in PLC, TwinCAT, and CI.',
        keyPerson: true,
      },
    });
    expect(res.statusCode).toBe(201);
    const entry = res.json().entry;
    expect(entry.id).toMatch(/^PER-\d{3,}$/);
    expect(entry.name).toBe('Alex Kim');
    expect(entry.keyPerson).toBe(true);
    expect(entry.summary.length).toBeGreaterThan(0);

    const list = (await app.inject({ method: 'GET', url: '/api/people' })).json();
    expect(list.count).toBe(1);

    const del = await app.inject({ method: 'DELETE', url: `/api/people/${entry.id}` });
    expect(del.statusCode).toBe(200);
  });

  it('requires name and role', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/people', payload: { name: 'No Role' } });
    expect(res.statusCode).toBe(400);
  });
});
