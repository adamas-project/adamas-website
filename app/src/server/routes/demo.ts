import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';
import { seedDemo } from '../../demo/demo.js';
import { buildObsidianVault } from '../../obsidian/export.js';
import { resolveObsidianDir } from '../../config/env.js';

export function registerDemoRoutes(app: FastifyInstance, ctx: AppContext): void {
  // Populate every store with the demo company, then refresh the Obsidian vault.
  // Entry-level idempotent: re-calling adds only entries that don't exist yet
  // (so it never duplicates, and picks up new demo data as the set grows).
  app.post('/api/demo', async () => {
    const result = await seedDemo(ctx.root, { ledger: ctx.ledger, knowledge: ctx.knowledge, people: ctx.people, records: ctx.records, glossary: ctx.glossary });

    // Mirror into Obsidian when anything was added, so the data room matches.
    if (!result.noop) {
      if (ctx.obsidianAuto) await ctx.obsidianAuto.runNow();
      else await buildObsidianVault({ ledger: ctx.ledger, knowledge: ctx.knowledge, assets: ctx.assets, people: ctx.people, records: ctx.records, glossary: ctx.glossary }, resolveObsidianDir(ctx.root));
    }
    return result;
  });

  // Factory reset: wipe every store, then re-seed a fresh demo database. Use this
  // to replace an old dataset (e.g. random names) with the current demo data.
  app.post('/api/demo/reset', async () => {
    await ctx.ledger.clearAll();
    await ctx.knowledge.clear();
    await ctx.people.clear();
    await ctx.records.clear();
    await ctx.glossary.clear();

    const result = await seedDemo(ctx.root, { ledger: ctx.ledger, knowledge: ctx.knowledge, people: ctx.people, records: ctx.records, glossary: ctx.glossary });

    if (ctx.obsidianAuto) await ctx.obsidianAuto.runNow();
    else await buildObsidianVault({ ledger: ctx.ledger, knowledge: ctx.knowledge, assets: ctx.assets, people: ctx.people, records: ctx.records, glossary: ctx.glossary }, resolveObsidianDir(ctx.root));

    return { reset: true, ...result };
  });
}
