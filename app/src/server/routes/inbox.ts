import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';
import { SAMPLE_SOURCES } from '../../evaluation/fixtures.js';
import { ValidationError } from '../../schema/validate.js';
import { LedgerError } from '../../ledger/ledger.js';

export function registerInboxRoutes(app: FastifyInstance, ctx: AppContext): void {
  const { inbox, localProvider } = ctx;

  app.get('/api/inbox', async (req) => {
    const q = req.query as { status?: 'pending' | 'confirmed' | 'dismissed' };
    return { candidates: inbox.list(q.status ?? 'pending'), pending: inbox.pendingCount };
  });

  // Ingest source documents through the local provider (Hermes). Defaults to the
  // bundled sample sources. Runs entirely on the local machine.
  app.post('/api/inbox/ingest', async (req) => {
    const body = (req.body ?? {}) as { sources?: typeof SAMPLE_SOURCES };
    const docs = body.sources ?? SAMPLE_SOURCES;
    const added = await inbox.ingest(localProvider, docs);
    return { added: added.length, candidates: added, pending: inbox.pendingCount };
  });

  app.post('/api/inbox/:id/confirm', async (req, reply) => {
    const { id } = req.params as { id: string };
    const overrides = (req.body ?? {}) as Record<string, unknown>;
    try {
      const decision = await inbox.confirm(id, overrides);
      return reply.code(201).send({ decision });
    } catch (err) {
      if (err instanceof ValidationError) return reply.code(400).send({ error: err.message, errors: err.errors });
      if (err instanceof LedgerError) return reply.code(409).send({ error: err.message });
      return reply.code(400).send({ error: (err as Error).message });
    }
  });

  app.post('/api/inbox/:id/dismiss', async (req, reply) => {
    const { id } = req.params as { id: string };
    try {
      const candidate = await inbox.dismiss(id);
      return { candidate };
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message });
    }
  });
}
