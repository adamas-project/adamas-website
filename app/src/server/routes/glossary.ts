import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';
import { defineTerm } from '../../glossary/define.js';

export function registerGlossaryRoutes(app: FastifyInstance, ctx: AppContext): void {
  const { glossary, localProvider } = ctx;

  app.get('/api/glossary', async (req) => {
    const q = req.query as { q?: string; tag?: string };
    return { terms: glossary.list(q), tags: glossary.allTags(), count: glossary.count };
  });

  // Draft a definition for a term on-device (no save). The UI pre-fills the form
  // with this; the user reviews and edits before saving.
  app.post('/api/glossary/define', async (req, reply) => {
    const b = (req.body ?? {}) as { term?: string };
    const term = b.term?.trim();
    if (!term) return reply.code(400).send({ error: 'term is required.' });
    const draft = await defineTerm(localProvider, term);
    return { ...draft, term };
  });

  app.post('/api/glossary', async (req, reply) => {
    const b = (req.body ?? {}) as { term?: string; definition?: string; aliases?: string[]; tags?: string[]; source?: string };
    const term = b.term?.trim();
    const definition = b.definition?.trim();
    if (!term || !definition) return reply.code(400).send({ error: 'term and definition are required.' });
    try {
      const entry = await glossary.create({
        term: term.slice(0, 200),
        definition,
        ...(b.aliases?.length ? { aliases: b.aliases.map((a) => a.trim()).filter(Boolean) } : {}),
        ...(b.tags?.length ? { tags: b.tags.map((tg) => tg.trim()).filter(Boolean) } : {}),
        ...(b.source ? { source: b.source.trim() } : {}),
      });
      return reply.code(201).send({ entry });
    } catch (err) {
      return reply.code(422).send({ error: (err as Error).message });
    }
  });

  app.delete('/api/glossary/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const ok = await glossary.remove(id);
    if (!ok) return reply.code(404).send({ error: `No glossary ${id}` });
    return { removed: id };
  });
}
