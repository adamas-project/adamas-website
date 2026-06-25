import { describe, it, expect, afterEach, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { GlossaryStore } from '../src/glossary/store.js';
import { validateGlossary } from '../src/glossary/schema.js';
import { createContext } from '../src/server/context.js';
import { buildApp } from '../src/server/app.js';
import { tempVault } from './helpers.js';

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
});

describe('glossary schema + store', () => {
  it('validates and rejects', () => {
    const ok = { id: 'GLO-001', term: 'FAT', definition: 'Factory Acceptance Test', date: '2026-06-24' };
    expect(validateGlossary(ok).valid).toBe(true);
    expect(validateGlossary({ ...ok, id: 'X-1' }).valid).toBe(false);
    expect(validateGlossary({ id: 'GLO-002', term: 'X' }).valid).toBe(false); // missing definition
  });

  it('creates, searches, persists, and removes (sorted by term)', async () => {
    const v = tempVault();
    cleanups.push(v.cleanup);
    const store = await GlossaryStore.open(path.join(v.root, 'glossary'));
    await store.create({ term: 'Takt time', definition: 'Pace of production to meet demand.', tags: ['ops'] });
    await store.create({ term: 'ARR', definition: 'Annual Recurring Revenue.', tags: ['finance'], aliases: ['Annual Recurring Revenue'] });
    expect(store.count).toBe(2);
    expect(store.list().map((g) => g.term)).toEqual(['ARR', 'Takt time']); // alphabetical
    expect(store.list({ q: 'recurring' }).map((g) => g.term)).toEqual(['ARR']); // matches alias
    expect(store.list({ tag: 'ops' }).map((g) => g.term)).toEqual(['Takt time']);

    const reopened = await GlossaryStore.open(path.join(v.root, 'glossary'));
    expect(reopened.count).toBe(2);
    expect(await reopened.remove('GLO-001')).toBe(true);
  });
});

describe('glossary API', () => {
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

  it('adds, lists, and deletes a term', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/glossary', payload: { term: 'WIP', definition: 'Work in progress.', tags: ['ops'] } });
    expect(res.statusCode).toBe(201);
    const entry = res.json().entry;
    expect(entry.id).toMatch(/^GLO-\d{3,}$/);

    const list = (await app.inject({ method: 'GET', url: '/api/glossary' })).json();
    expect(list.count).toBe(1);

    expect((await app.inject({ method: 'DELETE', url: `/api/glossary/${entry.id}` })).statusCode).toBe(200);
  });

  it('requires term and definition', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/glossary', payload: { term: 'X' } });
    expect(res.statusCode).toBe(400);
  });
});
