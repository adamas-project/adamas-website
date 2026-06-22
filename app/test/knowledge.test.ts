import { describe, it, expect, afterEach, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { KnowledgeStore } from '../src/knowledge/store.js';
import { validateKnowledge } from '../src/knowledge/schema.js';
import { extractFromHtml, extractTweetId, inferType, parseTweetResult } from '../src/knowledge/extract.js';
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

  it('strips leaked web-component CSS and shadow-DOM templates (X/Twitter SPA chrome)', () => {
    const html = `<html><head><title>CyrilXBT on X</title>
      <meta property="og:description" content="Article Loops: the quiet skill behind every AI system that scales."/>
      </head><body>
      <template shadowrootmode="open"><style>.x{color:red}</style><span>hidden</span></template>
      <p>:host{display:inline-block;direction:ltr}span{display:inline-block} 117.1K Views</p>
      <p>:where(number-flow-react){line-height:1} Read 27 replies</p>
      </body></html>`;
    const { text } = extractFromHtml(html);
    expect(text).toMatch(/Article Loops/);
    expect(text).not.toMatch(/display:inline-block/);
    expect(text).not.toMatch(/number-flow-react/);
    expect(text).not.toMatch(/hidden/); // shadow-DOM template removed
  });

  it('parses a tweet status id and the syndication JSON', () => {
    expect(extractTweetId('https://x.com/cyrilXBT/status/2068850474384609543')).toBe('2068850474384609543');
    expect(extractTweetId('https://twitter.com/a/status/123')).toBe('123');
    expect(extractTweetId('https://example.com/page')).toBeNull();

    const parsed = parseTweetResult({
      text: 'Article Loops: the quiet skill behind every AI system that actually scales.',
      user: { name: 'CyrilXBT', screen_name: 'cyrilXBT' },
    });
    expect(parsed?.text).toMatch(/Article Loops/);
    expect(parsed?.author).toBe('CyrilXBT (@cyrilXBT)');
    expect(parsed?.title).toMatch(/CyrilXBT on X/);
    expect(parseTweetResult({})).toBeNull();
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

  it('does not summarize link-only / empty content (no chatbot refusal stored)', async () => {
    // A post that is basically just a link: the model should never be asked.
    const provider = { summarize: async () => 'Sure! Could you please paste the content of the article?' };
    const kn = await summarizeKnowledge(provider as never, 'https://t.co/SVowI3vLbO');
    expect(kn.summary).toMatch(/not enough readable text/i);
    expect(kn.takeaways).toEqual([]);
  });

  it('discards a chatbot refusal and falls back to the deterministic summary', async () => {
    const realText =
      'We adopted milestone billing to protect cash flow. Invoices are split 50/40/10 across the project. ' +
      'This shortens the cash cycle and lowers the risk of a late final payment.';
    const refusing = { summarize: async () => "I'm sorry, I don't have access to that link. Could you paste the text?" };
    const kn = await summarizeKnowledge(refusing as never, realText);
    expect(kn.summary).not.toMatch(/don'?t have access|could you paste/i);
    expect(kn.summary.length).toBeGreaterThan(0);
  });

  it('uses a provider structured synthesis (title, summary, takeaways, tags)', async () => {
    const provider = {
      synthesizeKnowledge: async () => ({
        title: 'Running Claude Code with guardrails',
        summary: 'A note on balancing autonomy and safety when running an AI coding agent unattended.',
        takeaways: ['Use a deny list to protect secrets', 'Keep a human in the loop for risky actions'],
        tags: ['ai-agents', 'permissions', 'safety'],
      }),
    };
    const longText =
      'A detailed note about running an AI coding agent unattended overnight. The tradeoff is autonomy versus ' +
      'safety, and a deny list plus a human in the loop keeps risky actions from causing damage to the codebase.';
    const kn = await summarizeKnowledge(provider as never, longText);
    expect(kn.title).toBe('Running Claude Code with guardrails');
    expect(kn.tags).toContain('ai-agents');
    expect(kn.takeaways.length).toBe(2);
  });

  it('derives a real title in the deterministic fallback (never "Untitled")', async () => {
    const text =
      'Letting an AI agent run unattended trades safety for leverage. A deny list keeps it from editing secrets. ' +
      'Keeping a human in the loop catches risky actions before they happen.';
    const kn = await summarizeKnowledge(new LocalLLMProvider(), text);
    expect(kn.title && kn.title.length).toBeGreaterThan(0);
    expect(kn.title).not.toBe('Untitled');
  });

  it('drops generic filler from auto tags', () => {
    const tags = extractTags('The file file work work list list thing thing kubernetes kubernetes scaling scaling.');
    expect(tags).toContain('kubernetes');
    expect(tags).not.toContain('file');
    expect(tags).not.toContain('work');
    expect(tags).not.toContain('list');
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
