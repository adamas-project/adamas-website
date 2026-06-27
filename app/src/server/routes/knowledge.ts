import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';
import { fetchResource } from '../../knowledge/fetch.js';
import { summarizeKnowledge } from '../../knowledge/summarize.js';
import { inferType } from '../../knowledge/extract.js';
import { KNOWLEDGE_TYPES, type KnowledgeType } from '../../knowledge/schema.js';

function asType(v: unknown): KnowledgeType | undefined {
  return typeof v === 'string' && (KNOWLEDGE_TYPES as readonly string[]).includes(v) ? (v as KnowledgeType) : undefined;
}

export function registerKnowledgeRoutes(app: FastifyInstance, ctx: AppContext): void {
  const { knowledge, localProvider } = ctx;

  app.get('/api/knowledge', async (req) => {
    const q = req.query as { q?: string; tag?: string; type?: string };
    return { entries: knowledge.list(q), tags: knowledge.allTags(), count: knowledge.count };
  });

  app.get('/api/knowledge/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const entry = knowledge.get(id);
    if (!entry) return reply.code(404).send({ error: `No knowledge ${id}` });
    return { entry };
  });

  // Capture a resource: fetch the URL (or use pasted text), summarize it locally,
  // and save a knowledge entry linked to the source.
  app.post('/api/knowledge', async (req, reply) => {
    const body = (req.body ?? {}) as { url?: string; text?: string; title?: string; type?: string; tags?: string[] };
    const url = body.url?.trim();
    let text = (body.text ?? '').trim();
    let title = body.title?.trim();
    let author: string | undefined;
    let type = asType(body.type);

    try {
      let fetchFailed = false;
      if (url && !text) {
        try {
          const fetched = await fetchResource(url);
          text = fetched.text;
          title = title || fetched.title;
          author = fetched.author;
          type = type || fetched.type;
        } catch {
          // Couldn't fetch (paywall, bot-block, network) — still save the link.
          fetchFailed = true;
        }
      }
      if (!url && !text) return reply.code(400).send({ error: 'Provide a URL or some text to capture.' });
      if (url && !type) type = inferType(url);

      // Summarize when we have real text; otherwise save a clear placeholder so
      // the link is never lost (the user can open it or paste the text later).
      const kn = text
        ? await summarizeKnowledge(localProvider, text)
        : {
            title: title || url || 'Saved link',
            summary:
              'Saved the link, but ADAMAS could not fetch its content automatically ' +
              '(paywalled, login-only, or blocked). Open the source, or paste the text here to summarize it.',
            takeaways: [] as string[],
            tags: [] as string[],
          };
      const tags = [...new Set([...(body.tags ?? []).map((t) => t.trim()).filter(Boolean), ...kn.tags])].slice(0, 10);

      const entry = await knowledge.create({
        title: (title || kn.title || url || 'Untitled').slice(0, 300),
        source: url || 'manual',
        type: type ?? (url ? 'link' : 'note'),
        summary: kn.summary,
        takeaways: kn.takeaways,
        tags,
        ...(author ? { author } : {}),
        ...(text ? { excerpt: text.slice(0, 500) } : {}),
      });
      return reply.code(201).send({ entry, fetchFailed });
    } catch (err) {
      return reply.code(422).send({ error: (err as Error).message });
    }
  });

  app.patch('/api/knowledge/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const b = (req.body ?? {}) as { title?: string; summary?: string; takeaways?: string[]; tags?: string[]; type?: string; source?: string };
    const patch: Record<string, unknown> = {};
    if (b.title != null) {
      const tt = b.title.trim();
      if (!tt) return reply.code(400).send({ error: 'title cannot be empty.' });
      patch.title = tt.slice(0, 300);
    }
    if (b.summary != null && b.summary.trim()) patch.summary = b.summary.trim();
    if (b.takeaways != null) patch.takeaways = b.takeaways.map((s) => s.trim()).filter(Boolean);
    if (b.tags != null) patch.tags = b.tags.map((s) => s.trim()).filter(Boolean);
    if (b.type != null) { const ty = asType(b.type); if (ty) patch.type = ty; }
    if (b.source != null && b.source.trim()) patch.source = b.source.trim();
    try {
      const entry = await knowledge.update(id, patch);
      if (!entry) return reply.code(404).send({ error: `No knowledge ${id}` });
      return { entry };
    } catch (err) {
      return reply.code(422).send({ error: (err as Error).message });
    }
  });

  app.delete('/api/knowledge/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const ok = await knowledge.remove(id);
    if (!ok) return reply.code(404).send({ error: `No knowledge ${id}` });
    return { removed: id };
  });
}
