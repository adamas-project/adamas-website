import { createHash } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';
import { SAMPLE_SOURCES } from '../../evaluation/fixtures.js';
import type { SourceDocument } from '../../evaluation/provider.js';
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

  // Upload/paste a meeting transcript: ADAMAS summarizes it (locally) into the
  // key outcomes, then extracts candidate decisions from that summary. Nothing
  // enters the ledger until confirmed.
  app.post('/api/inbox/transcript', async (req, reply) => {
    const body = (req.body ?? {}) as {
      text?: string;
      filename?: string;
      title?: string;
      date?: string;
      summarize?: boolean;
    };
    const text = (body.text ?? '').trim();
    if (!text) return reply.code(400).send({ error: 'Transcript text is empty.' });

    const date = body.date && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : new Date().toISOString().slice(0, 10);
    const title = (body.title?.trim() || body.filename?.replace(/\.[^.]+$/, '') || 'Meeting transcript').slice(0, 120);

    // Summarize first (when the provider supports it and the text is long enough).
    let summary = text;
    let summarized = false;
    if (body.summarize !== false && localProvider.summarize && text.length > 400) {
      summary = await localProvider.summarize(text);
      summarized = true;
    }

    const hash = createHash('sha1').update(`${title}|${text}`).digest('hex').slice(0, 8);
    const doc: SourceDocument = {
      ref: `transcript:${date}#${hash}`,
      kind: 'meeting',
      date,
      title,
      text: summary,
    };
    const added = await inbox.ingest(localProvider, [doc]);
    return { summarized, summary, added: added.length, candidates: added, pending: inbox.pendingCount };
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
