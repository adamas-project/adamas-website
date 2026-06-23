import { createHash, randomBytes } from 'node:crypto';
import path from 'node:path';
import { promises as fs, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';
import { SAMPLE_SOURCES } from '../../evaluation/fixtures.js';
import type { SourceDocument } from '../../evaluation/provider.js';
import { ValidationError } from '../../schema/validate.js';
import { LedgerError } from '../../ledger/ledger.js';
import { autoConfirmConfidence } from '../../config/env.js';

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

  // Shared: summarize a transcript locally, then extract candidate decisions.
  async function ingestTranscript(opts: { text: string; title?: string; date?: string; summarize?: boolean }) {
    const text = opts.text.trim();
    const date = opts.date && /^\d{4}-\d{2}-\d{2}$/.test(opts.date) ? opts.date : new Date().toISOString().slice(0, 10);
    const title = (opts.title?.trim() || 'Meeting transcript').slice(0, 120);

    let summary = text;
    let summarized = false;
    if (opts.summarize !== false && localProvider.summarize && text.length > 400) {
      summary = await localProvider.summarize(text);
      summarized = true;
    }
    const hash = createHash('sha1').update(`${title}|${text}`).digest('hex').slice(0, 8);
    const doc: SourceDocument = { ref: `transcript:${date}#${hash}`, kind: 'meeting', date, title, text: summary };
    const added = await inbox.ingest(localProvider, [doc]);
    return { summarized, summary, added: added.length, candidates: added, pending: inbox.pendingCount };
  }

  // Upload/paste a meeting transcript (text). Summarized locally, then extracted.
  app.post('/api/inbox/transcript', async (req, reply) => {
    const body = (req.body ?? {}) as { text?: string; filename?: string; title?: string; date?: string; summarize?: boolean };
    const text = (body.text ?? '').trim();
    if (!text) return reply.code(400).send({ error: 'Transcript text is empty.' });
    const title = body.title?.trim() || body.filename?.replace(/\.[^.]+$/, '');
    return ingestTranscript({ text, title, date: body.date, summarize: body.summarize });
  });

  // Drop an audio/video recording: ADAMAS transcribes it locally (via the
  // configured on-device engine), then summarizes + extracts. Multipart upload.
  app.post('/api/inbox/audio', async (req, reply) => {
    if (!ctx.transcriber) {
      return reply.code(400).send({
        error:
          'No local transcription engine is configured. Set ADAMAS_TRANSCRIBE_CMD (e.g. a whisper.cpp command) to drop recordings, or upload a text transcript instead.',
      });
    }
    const data = await (req as any).file();
    if (!data) return reply.code(400).send({ error: 'No file uploaded.' });

    const tmpDir = path.join(ctx.root, 'tmp');
    await fs.mkdir(tmpDir, { recursive: true });
    const ext = path.extname(String(data.filename || '')).slice(0, 8) || '.bin';
    const stamp = `${Date.now()}-${randomBytes(4).toString('hex')}`;
    const inputPath = path.join(tmpDir, `audio-${stamp}${ext}`);
    const title = (data.fields?.title?.value as string) || String(data.filename || 'Recording').replace(/\.[^.]+$/, '');
    const date = data.fields?.date?.value as string | undefined;

    try {
      await pipeline(data.file, createWriteStream(inputPath));
      const transcript = await ctx.transcriber.transcribe(inputPath);
      if (!transcript.trim()) return reply.code(422).send({ error: 'Transcription produced no text.' });
      const result = await ingestTranscript({ text: transcript, title, date });
      return { transcript, ...result };
    } catch (err) {
      return reply.code(422).send({ error: (err as Error).message });
    } finally {
      await fs.rm(inputPath, { force: true }).catch(() => {});
    }
  });

  // Autopilot: auto-file every pending candidate at/above a confidence threshold
  // (body.threshold, else the configured default). Reversible like any decision.
  app.post('/api/inbox/auto-confirm', async (req) => {
    const body = (req.body ?? {}) as { threshold?: number };
    const threshold = typeof body.threshold === 'number' ? body.threshold : autoConfirmConfidence();
    const { confirmed, skipped } = await inbox.autoConfirm(threshold);
    return { confirmed: confirmed.map((d) => d.id), confirmedCount: confirmed.length, skipped, pending: inbox.pendingCount, threshold };
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
