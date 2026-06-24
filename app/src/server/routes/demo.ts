import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';
import { seedDemo } from '../../demo/demo.js';
import { buildObsidianVault } from '../../obsidian/export.js';
import { resolveObsidianDir } from '../../config/env.js';

export function registerDemoRoutes(app: FastifyInstance, ctx: AppContext): void {
  // Populate every store with the demo company, then refresh the Obsidian vault.
  // Idempotent (marker file); pass ?force=1 to seed again on top.
  app.post('/api/demo', async (req) => {
    const force = (req.query as Record<string, string>)?.force === '1';
    const result = await seedDemo(ctx.root, { ledger: ctx.ledger, knowledge: ctx.knowledge, people: ctx.people, records: ctx.records }, force);

    // Mirror into Obsidian right away so the data room is populated too.
    if (!result.alreadySeeded) {
      if (ctx.obsidianAuto) await ctx.obsidianAuto.runNow();
      else await buildObsidianVault({ ledger: ctx.ledger, knowledge: ctx.knowledge, assets: ctx.assets, people: ctx.people, records: ctx.records }, resolveObsidianDir(ctx.root));
    }
    return result;
  });
}
