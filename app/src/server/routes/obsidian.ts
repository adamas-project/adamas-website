import type { FastifyInstance } from 'fastify';
import { existsSync } from 'node:fs';
import type { AppContext } from '../context.js';
import { buildObsidianVault } from '../../obsidian/export.js';
import { importObsidianInbox } from '../../obsidian/import.js';
import { computeReadiness } from '../../obsidian/readiness.js';
import { resolveObsidianDir } from '../../config/env.js';

export function registerObsidianRoutes(app: FastifyInstance, ctx: AppContext): void {
  const dir = resolveObsidianDir(ctx.root);

  app.get('/api/obsidian', async () => ({
    dir,
    exists: existsSync(dir),
    auto: !!ctx.obsidianAuto,
    readiness: computeReadiness(ctx.ledger, ctx.knowledge, ctx.people, ctx.records),
  }));

  app.post('/api/obsidian/export', async (_req, reply) => {
    try {
      // Route through the auto-exporter when active so a manual export and an
      // auto-refresh are serialized and never clobber each other mid-write.
      const result = ctx.obsidianAuto
        ? await ctx.obsidianAuto.runNow()
        : await buildObsidianVault({ ledger: ctx.ledger, knowledge: ctx.knowledge, assets: ctx.assets, people: ctx.people, records: ctx.records }, dir);
      return result;
    } catch (err) {
      return reply.code(500).send({ error: (err as Error).message });
    }
  });

  // Write-back: import notes the operator dropped into obsidian/_Inbox/.
  app.post('/api/obsidian/import', async (_req, reply) => {
    try {
      return await importObsidianInbox({ knowledge: ctx.knowledge, provider: ctx.localProvider }, dir);
    } catch (err) {
      return reply.code(500).send({ error: (err as Error).message });
    }
  });
}
