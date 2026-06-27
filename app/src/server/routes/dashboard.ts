import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';
import { computeOverview } from '../../dashboard/overview.js';

export function registerDashboardRoutes(app: FastifyInstance, ctx: AppContext): void {
  // One read-only rollup of every store for the overview dashboard.
  app.get('/api/dashboard', async () =>
    computeOverview({
      ledger: ctx.ledger,
      knowledge: ctx.knowledge,
      people: ctx.people,
      records: ctx.records,
      glossary: ctx.glossary,
    }),
  );
}
