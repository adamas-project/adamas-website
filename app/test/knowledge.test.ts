import { describe, it, expect, afterEach, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { KnowledgeStore } from '../src/knowledge/store.js';
import { validateKnowledge } from '../src/knowledge/schema.js';
import { extractFromHtml, inferType } from '../src/knowledge/extract.js';
import { summarizeKnowledge, extractTags } from '../src/knowledge/summarize.js';
import { LocalLLMProvider } from '../src/evaluation/local.js';
import { createContext } from '../src/server/context.js';
import { buildApp } from '../src/server/app.js';
import { tempVault } from './helpers.js';

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
});

describe('knowledge schema + store', () => {
  it('validates a well-formed entry and rejects a bad one', () => {
    const ok = { id: 'KNW-001', title: 'T', source: 'https://x.com/a', type: 'article', date: '2026-06-21', summary: 's' };
    expect(validateKnowledge(ok).valid).toBe(true);
    expect(validateKnowledge({ ...ok, type: 'tweet' }).valid).toBe(false);
    expect(validateKnowledge({ ...ok, id: 'X-1' }).valid).toBe(false);
  });

  it('creates, lists, gets, filters, and removes entries', async () => {
    const v = tempVault();
    cleanups.push(v.cleanup);
    const store = await KnowledgeStore.open(path.join(v.root, 'knowledge'));

    const a = await store.create({ title: 'Local-first apps', source: 'https://ex.com/a', type: 'article', summary: 'why local-first', tags: ['local-first', 'crdt'] });
    const b = await store.create({ title: 'Decision hygiene', source: 'manual', type: 'note', summary: 'keep the why', tags: ['decisions'] });
    expect(a.id).toBe('KNW-001');
    expect(b.id).toBe('KNW-002');
    expect(store.count).toBe(2);
    expect(store.list({ tag: 'crdt' }).map((e) => e.id)).toEqual(['KNW-001']);
    expect(store.list({ q: 'hygiene' }).map((e) => e.id)).toEqual(['KNW-002']);
    expect(store.allTags()).toContain('local-first');

    // persists to disk: reopen reads it back
    const reopened = await KnowledgeStore.open(path.join(v.root, 'knowledge'));
    expect(reopened.count).toBe(2);

    expect(await reopened.remove('KNW-001')).toBe(true);
    expect(reopened.get('KNW-001')).toBeUndefined();
  });
});

describe('html extraction + type inference', () => {
  it('pulls title, og:description, author, and readable text', () => {
    const html = `<html><head><title>Raw Title</title>
      <meta property="og:title" content="Great Article"/>
      <meta name="author" content="Jane Doe"/>
      <meta property="og:description" content="A short description."/>
      </head><body><script>ignore()</script><p>First paragraph of body.</p><p>Second one.</p></body></html>`;
    const { title, text, author } = extractFromHtml(html);
    expect(title).toBe('Great Article');
    expect(author).toBe('Jane Doe');
    expect(text).toMatch(/A short description/);
    expect(text).toMatch(/First paragraph/);
    expect(text).not.toMatch(/ignore\(\)/);
  });

  it('infers resource type from the URL', () => {
    expect(inferType('https://youtube.com/watch?v=x')).toBe('video');
    expect(inferType('https://x.com/user/status/1')).toBe('post');
    expect(inferType('https://medium.com/@a/post')).toBe('article');
    expect(inferType('https://example.com/page')).toBe('link');
  });

  it('extracts frequent keywords as tags', () => {
    const tags = extractTags('Kubernetes scaling. Kubernetes pods. Scaling pods with kubernetes autoscaling autoscaling.');
    expect(tags).toContain('kubernetes');
  });
});

describe('summarizeKnowledge (local provider)', () => {
  it('produces a summary, takeaways, and tags', async () => {
    const text =
      'We decided to adopt local-first architecture. The key benefit is offline resilience. ' +
      'Local-first means data lives on the device. Sync happens in the background. ' +
      'Local-first improves privacy and ownership of data.';
    const kn = await summarizeKnowledge(new LocalLLMProvider(), text);
    expect(kn.summary.length).toBeGreaterThan(0);
    expect(Array.isArray(kn.takeaways)).toBe(true);
    expect(kn.tags).toContain('local-first');
  });
});

describe('knowledge API', () => {
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

  it('captures a pasted resource, lists it, and deletes it', async () => {
    const create = await app.inject({
      method: 'POST',
      url: '/api/knowledge',
      payload: {
        text: 'Local-first software keeps data on the device. Local-first gives ownership and offline use. Local-first sync is background.',
        title: 'Local-first software',
        tags: ['architecture'],
      },
    });
    expect(create.statusCode).toBe(201);
    const entry = create.json().entry;
    expect(entry.id).toMatch(/^KNW-\d{3,}$/);
    expect(entry.source).toBe('manual');
    expect(entry.tags).toContain('architecture');

    const list = (await app.inject({ method: 'GET', url: '/api/knowledge' })).json();
    expect(list.count).toBe(1);
    expect(list.entries[0].title).toBe('Local-first software');

    const del = await app.inject({ method: 'DELETE', url: `/api/knowledge/${entry.id}` });
    expect(del.statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: '/api/knowledge' })).json().count).toBe(0);
  });

  it('requires a url or text', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/knowledge', payload: {} });
    expect(res.statusCode).toBe(400);
  });
});
