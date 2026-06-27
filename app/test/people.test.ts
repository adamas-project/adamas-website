import { describe, it, expect, afterEach, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { PeopleStore, mergePeopleEntries } from '../src/people/store.js';
import type { PersonEntry } from '../src/people/schema.js';
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

  it('clear() removes every record (files + memory)', async () => {
    const v = tempVault();
    cleanups.push(v.cleanup);
    const store = await PeopleStore.open(path.join(v.root, 'people'));
    await store.create({ name: 'A', role: 'r', kind: 'employee', summary: 's' });
    await store.create({ name: 'B', role: 'r', kind: 'employee', summary: 's' });
    expect(store.count).toBe(2);
    await store.clear();
    expect(store.count).toBe(0);
    const reopened = await PeopleStore.open(path.join(v.root, 'people'));
    expect(reopened.count).toBe(0); // persisted
  });
});

describe('merge duplicate people', () => {
  it('combines fields, keeps the strongest kind and canonical id (pure)', () => {
    const a: PersonEntry = { id: 'PER-001', name: 'Massimo Sahin', role: 'Founder', kind: 'founder', date: '2024-01-01', summary: 'Founder and CEO.', skills: ['strategy'], keyPerson: true, location: 'Stuttgart, DE' };
    const b: PersonEntry = { id: 'PER-115', name: 'Massimo Sahin', role: 'CEO', kind: 'employee', date: '2026-06-01', summary: 'A much longer, hand-written bio that should win on length.', skills: ['operations'], email: 'm@x.example' };
    const merged = mergePeopleEntries([a, b]);
    expect(merged.id).toBe('PER-001');
    expect(merged.kind).toBe('founder'); // founder beats employee
    expect(merged.summary).toBe(b.summary); // longest wins
    expect(merged.skills).toEqual(['strategy', 'operations']); // unioned
    expect(merged.keyPerson).toBe(true); // OR-ed
    expect(merged.email).toBe('m@x.example'); // filled from b
    expect(merged.date).toBe('2024-01-01'); // earliest
  });

  it('merges same-name records in the store and is idempotent', async () => {
    const v = tempVault();
    cleanups.push(v.cleanup);
    const store = await PeopleStore.open(path.join(v.root, 'people'));
    await store.create({ name: 'Massimo Sahin', role: 'Founder', kind: 'founder', summary: 'Founder.', keyPerson: true });
    await store.create({ name: 'massimo sahin', role: 'CEO', kind: 'employee', summary: 'Manually added duplicate of the founder.' });
    await store.create({ name: 'Sam Lee', role: 'Sales', kind: 'employee', summary: 'No duplicate.' });
    expect(store.count).toBe(3);
    expect(store.duplicateCount()).toBe(1);

    const r = await store.mergeDuplicates();
    expect(r.merged).toBe(1);
    expect(r.names).toContain('Massimo Sahin');
    expect(store.count).toBe(2);
    expect(store.duplicateCount()).toBe(0);
    const massimo = store.list().find((p) => /massimo/i.test(p.name))!;
    expect(massimo.id).toBe('PER-001'); // canonical id kept
    expect(massimo.kind).toBe('founder');

    // Persisted + idempotent: reopening and re-merging is a no-op.
    const reopened = await PeopleStore.open(path.join(v.root, 'people'));
    expect(reopened.count).toBe(2);
    expect((await reopened.mergeDuplicates()).merged).toBe(0);
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

  it('edits a person via PATCH (only provided fields)', async () => {
    const created = (await app.inject({
      method: 'POST',
      url: '/api/people',
      payload: { name: 'Edit Me', role: 'Intern', kind: 'employee' },
    })).json().entry;

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/people/${created.id}`,
      payload: { role: 'Senior Engineer', keyPerson: true, skills: ['plc', 'cad'], summary: 'Promoted.' },
    });
    expect(res.statusCode).toBe(200);
    const entry = res.json().entry;
    expect(entry.name).toBe('Edit Me'); // untouched
    expect(entry.role).toBe('Senior Engineer'); // changed
    expect(entry.keyPerson).toBe(true);
    expect(entry.skills).toEqual(['plc', 'cad']);
    expect(entry.id).toBe(created.id); // id immutable

    // Empty name is rejected; unknown id is 404.
    expect((await app.inject({ method: 'PATCH', url: `/api/people/${created.id}`, payload: { name: '  ' } })).statusCode).toBe(400);
    expect((await app.inject({ method: 'PATCH', url: '/api/people/PER-999', payload: { role: 'x' } })).statusCode).toBe(404);

    await app.inject({ method: 'DELETE', url: `/api/people/${created.id}` });
  });

  it('deletes with an empty JSON body + content-type (browser-style) — no 400', async () => {
    const created = (await app.inject({
      method: 'POST',
      url: '/api/people',
      payload: { name: 'Delete Me', role: 'Temp', kind: 'employee' },
    })).json().entry;
    // Reproduce the browser DELETE: application/json header but no body.
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/people/${created.id}`,
      headers: { 'content-type': 'application/json' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().removed).toBe(created.id);
  });

  it('reports and merges duplicates via the API', async () => {
    await app.inject({ method: 'POST', url: '/api/people', payload: { name: 'Dana Fox', role: 'COO', kind: 'employee' } });
    await app.inject({ method: 'POST', url: '/api/people', payload: { name: 'Dana Fox', role: 'Chief Operating Officer', kind: 'employee' } });
    const before = (await app.inject({ method: 'GET', url: '/api/people' })).json();
    expect(before.duplicates).toBeGreaterThanOrEqual(1);

    const merge = await app.inject({ method: 'POST', url: '/api/people/merge-duplicates' });
    expect(merge.statusCode).toBe(200);
    expect(merge.json().merged).toBeGreaterThanOrEqual(1);

    const after = (await app.inject({ method: 'GET', url: '/api/people' })).json();
    expect(after.duplicates).toBe(0);
    expect(after.people.filter((p: any) => p.name === 'Dana Fox')).toHaveLength(1);
  });
});
