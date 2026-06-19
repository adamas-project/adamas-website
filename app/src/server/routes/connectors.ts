import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';

export function registerConnectorRoutes(app: FastifyInstance, ctx: AppContext): void {
  const { connectors, inbox, localProvider } = ctx;

  app.get('/api/connectors', async () => ({ connectors: connectors.list() }));

  // Pull new/changed source material from a connector (read-only) and run it
  // through Hermes into the Capture Inbox. Nothing enters the ledger here.
  app.post('/api/connectors/:id/pull', async (req, reply) => {
    const { id } = req.params as { id: string };
    try {
      const result = await connectors.pull(id);
      const added = await inbox.ingest(localProvider, result.documents);
      return {
        connector: id,
        scanned: result.scanned,
        skipped: result.skipped,
        newDocuments: result.documents.length,
        added: added.length,
        pending: inbox.pendingCount,
      };
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message });
    }
  });
}
