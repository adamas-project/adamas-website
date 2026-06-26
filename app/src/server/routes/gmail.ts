import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';
import { imapConfig } from '../../config/env.js';
import { GmailLabeler, isGmailHost } from '../../ingestion/gmail-label.js';

// Opt-in "auto-label decision emails" for Gmail. Active only when a Gmail app
// password is configured (ADAMAS_IMAP_*). It only ADDS a label — never deletes,
// moves, or sends — using the operator's own credentials over a local connection.
export function registerGmailRoutes(app: FastifyInstance, _ctx: AppContext): void {
  app.get('/api/gmail/status', async () => {
    const cfg = imapConfig();
    return {
      configured: !!cfg,
      isGmail: cfg ? isGmailHost(cfg.host) : false,
      user: cfg?.user,
      label: 'ADAMAS/Decisions',
    };
  });

  // Verify the app password actually connects (more than the env-only status).
  app.post('/api/gmail/test-connection', async (_req, reply) => {
    const cfg = imapConfig();
    if (!cfg) return reply.code(400).send({ error: 'No mailbox connected. Set the ADAMAS_IMAP_* variables first.' });
    try {
      return await new GmailLabeler(cfg).testConnection();
    } catch (err) {
      return reply.code(502).send({ error: `Could not connect: ${(err as Error).message}` });
    }
  });

  // Drop a sample decision email into the inbox so labeling can be tested in-app.
  app.post('/api/gmail/test-email', async (_req, reply) => {
    const cfg = imapConfig();
    if (!cfg) return reply.code(400).send({ error: 'No mailbox connected. Set the ADAMAS_IMAP_* variables first.' });
    try {
      return await new GmailLabeler(cfg).appendTestEmail();
    } catch (err) {
      return reply.code(502).send({ error: `Could not send the test email: ${(err as Error).message}` });
    }
  });

  app.post('/api/gmail/label-decisions', async (req, reply) => {
    const cfg = imapConfig();
    if (!cfg) {
      return reply.code(400).send({
        error:
          'No mailbox connected. Set ADAMAS_IMAP_HOST=imap.gmail.com, ADAMAS_IMAP_USER, and ' +
          'ADAMAS_IMAP_PASS (a Gmail app password) to enable decision labeling.',
      });
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
