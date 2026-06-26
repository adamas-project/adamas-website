import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';
import { GmailLabeler, isGmailHost } from '../../ingestion/gmail-label.js';
import { resolveImapConfig, saveGmailSettings, clearGmailSettings } from '../gmail-settings.js';

// Opt-in "auto-label decision emails" for Gmail. Configurable from the app
// (Settings box) or via ADAMAS_IMAP_* env vars. It only ADDS a label — never
// deletes, moves, or sends — using the operator's own credentials locally.
export function registerGmailRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.get('/api/gmail/status', async () => {
    const { cfg, source } = await resolveImapConfig(ctx.root);
    return {
      configured: !!cfg,
      isGmail: cfg ? isGmailHost(cfg.host) : false,
      user: cfg?.user,
      source,
      label: 'ADAMAS/Decisions',
    };
  });

  // Save Gmail address + app password from the app (no .env editing needed).
  app.post('/api/gmail/settings', async (req, reply) => {
    const b = (req.body ?? {}) as { user?: string; pass?: string; host?: string };
    const user = b.user?.trim();
    const pass = b.pass?.trim();
    const host = (b.host?.trim() || 'imap.gmail.com').toLowerCase();
    if (!user || !pass) return reply.code(400).send({ error: 'Email and app password are required.' });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(user)) return reply.code(400).send({ error: 'That does not look like an email address.' });
    if (!isGmailHost(host)) return reply.code(400).send({ error: 'Only Gmail / Google Workspace accounts are supported here.' });
    await saveGmailSettings(ctx.root, { host, user, pass });
    return { ok: true, user };
  });

  app.delete('/api/gmail/settings', async () => {
    await clearGmailSettings(ctx.root);
    return { ok: true };
  });

  app.post('/api/gmail/test-connection', async (_req, reply) => {
    const { cfg } = await resolveImapConfig(ctx.root);
    if (!cfg) return reply.code(400).send({ error: 'No mailbox connected. Add your Gmail address and app password first.' });
    try {
      return await new GmailLabeler(cfg).testConnection();
    } catch (err) {
      return reply.code(502).send({ error: `Could not connect: ${(err as Error).message}` });
    }
  });

  app.post('/api/gmail/test-email', async (_req, reply) => {
    const { cfg } = await resolveImapConfig(ctx.root);
    if (!cfg) return reply.code(400).send({ error: 'No mailbox connected. Add your Gmail address and app password first.' });
    try {
      return await new GmailLabeler(cfg).appendTestEmail();
    } catch (err) {
      return reply.code(502).send({ error: `Could not send the test email: ${(err as Error).message}` });
    }
  });

  app.post('/api/gmail/label-decisions', async (req, reply) => {
    const { cfg } = await resolveImapConfig(ctx.root);
    if (!cfg) {
      return reply.code(400).send({ error: 'No mailbox connected. Add your Gmail address and app password first.' });
    }
    if (!isGmailHost(cfg.host)) {
      return reply.code(400).send({ error: `Decision labeling supports Gmail; configured host is ${cfg.host}.` });
    }
    const body = (req.body ?? {}) as { max?: number; sinceDays?: number };
    try {
      const labeler = new GmailLabeler(cfg);
      const result = await labeler.labelDecisions({
        ...(body.max ? { max: Math.min(Number(body.max), 500) } : {}),
        ...(body.sinceDays ? { sinceDays: Number(body.sinceDays) } : {}),
      });
      return result;
    } catch (err) {
      return reply.code(502).send({ error: `Gmail labeling failed: ${(err as Error).message}` });
    }
  });
}
