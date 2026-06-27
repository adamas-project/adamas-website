import { describe, it, expect, afterEach, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { GlossaryStore } from '../src/glossary/store.js';
import { validateGlossary } from '../src/glossary/schema.js';
import { defineTerm, inferGlossaryTags } from '../src/glossary/define.js';
import { LocalLLMProvider } from '../src/evaluation/local.js';
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

describe('glossary auto-define', () => {
  const provider = new LocalLLMProvider(); // no defineGlossaryTerm → dictionary/scaffold paths

  it('defines a known term from the built-in dictionary', async () => {
    const d = await defineTerm(provider, 'FAT');
    expect(d.source).toBe('builtin');
    expect(d.definition).toMatch(/Factory Acceptance Test/i);
    expect(d.tags).toContain('ops');
  });

  it('matches an alias (spelled-out form) to its canonical entry', async () => {
    const d = await defineTerm(provider, 'annual recurring revenue');
    expect(d.source).toBe('builtin');
    expect(d.definition).toMatch(/recurring/i);
    // the typed term itself is dropped from aliases
    expect(d.aliases.map((a) => a.toLowerCase())).not.toContain('annual recurring revenue');
  });

  it('scaffolds unknown terms with inferred tags, never a hard fail', async () => {
    const d = await defineTerm(provider, 'Quarterly revenue bridge');
    expect(d.source).toBe('draft');
    expect(d.definition).toContain('Quarterly revenue bridge');
    expect(d.tags).toContain('finance');
  });

  it('prefers a local model when one is available', async () => {
    const modelProvider = Object.assign(new LocalLLMProvider(), {
      defineGlossaryTerm: async () => ({ definition: 'A model-written definition.', tags: ['custom'] }),
    });
    const d = await defineTerm(modelProvider, 'Anything');
    expect(d.source).toBe('model');
    expect(d.definition).toBe('A model-written definition.');
  });

  it('infers tags from free text', () => {
    expect(inferGlossaryTags('gross margin and ebitda')).toContain('finance');
    expect(inferGlossaryTags('the sales pipeline and quota')).toContain('sales');
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

  it('drafts a definition without saving it', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/glossary/define', payload: { term: 'OEE' } });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.term).toBe('OEE');
    expect(body.definition).toMatch(/Overall Equipment Effectiveness/i);
    // define is a draft only — nothing persisted
    expect((await app.inject({ method: 'GET', url: '/api/glossary' })).json().count).toBe(0);
  });

  it('rejects an empty define request', async () => {
    expect((await app.inject({ method: 'POST', url: '/api/glossary/define', payload: {} })).statusCode).toBe(400);
  });

  it('edits a term via PATCH', async () => {
    const entry = (await app.inject({ method: 'POST', url: '/api/glossary', payload: { term: 'OEE', definition: 'old def' } })).json().entry;
    const res = await app.inject({ method: 'PATCH', url: `/api/glossary/${entry.id}`, payload: { definition: 'new def', tags: ['ops'] } });
    expect(res.statusCode).toBe(200);
    expect(res.json().entry.definition).toBe('new def');
    expect(res.json().entry.term).toBe('OEE'); // untouched
    expect((await app.inject({ method: 'PATCH', url: `/api/glossary/${entry.id}`, payload: { definition: ' ' } })).statusCode).toBe(400);
    await app.inject({ method: 'DELETE', url: `/api/glossary/${entry.id}` });
  });
});
