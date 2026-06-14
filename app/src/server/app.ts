import Fastify, { type FastifyInstance } from 'fastify';
import type { AppContext } from './context.js';
import { registerLedgerRoutes } from './routes/ledger.js';

export function buildApp(ctx: AppContext): FastifyInstance {
  const app = Fastify({ logger: false });

  // Hard data boundary: no external telemetry, no tracking. The only network
  // surface is this local API.
  app.get('/api/health', async () => ({ ok: true }));

  registerLedgerRoutes(app, ctx);

  return app;
}
