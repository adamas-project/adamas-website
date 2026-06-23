import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';
import { autoConfirmConfidence, connectorPullMinutes } from '../../config/env.js';

export function registerConnectorRoutes(app: FastifyInstance, ctx: AppContext): void {
  const { connectors, inbox, localProvider } = ctx;

  app.get('/api/connectors', async () => ({
    connectors: connectors.list(),
    autoPullMinutes: connectorPullMinutes(),
    autoConfirmConfidence: autoConfirmConfidence(),
  }));

  // Pull every connector once (used manually or by the background scheduler).
  app.post('/api/connectors/pull-all', async () => {
    const result = ctx.connectorScheduler
      ? await ctx.connectorScheduler.runOnce()
      : await pullAll();
    return { ...result, pending: inbox.pendingCount };
  });

  async function pullAll(): Promise<{ pulled: number; added: number; confirmed: number }> {
    let pulled = 0;
    let added = 0;
    for (const info of connectors.list()) {
      try {
        const result = await connectors.pull(info.id);
        pulled += result.documents.length;
        added += (await inbox.ingest(localProvider, result.documents)).length;
      } catch {
        /* skip a failing connector; others still run */
      }
    }
    const { confirmed } = await inbox.autoConfirm(autoConfirmConfidence());
    return { pulled, added, confirmed: confirmed.length };
  }

  // Pull new/changed source material from a connector (read-only) and run it
  // through Hermes into the Capture Inbox. With autopilot on, high-confidence
  // candidates are auto-filed; otherwise they wait in the inbox for review.
  app.post('/api/connectors/:id/pull', async (req, reply) => {
    const { id } = req.params as { id: string };
    try {
      const result = await connectors.pull(id);
      const added = await inbox.ingest(localProvider, result.documents);
      const { confirmed } = await inbox.autoConfirm(autoConfirmConfidence());
      return {
        connector: id,
        scanned: result.scanned,
        skipped: result.skipped,
        newDocuments: result.documents.length,
        added: added.length,
        confirmed: confirmed.length,
        pending: inbox.pendingCount,
      };
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message });
    }
  });
}
