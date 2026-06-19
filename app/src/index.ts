import { createContext } from './server/context.js';
import { buildApp, registerWebClient } from './server/app.js';
import { resolveVaultRoot, serverHost, serverPort } from './config/env.js';
import { seedVault } from './seed/seed.js';

export const ADAMAS = 'All Decisions And Memory Archive System';

async function main(): Promise<void> {
  const root = resolveVaultRoot();

  let ctx = await createContext(root);

  // Seed an EMPTY vault on first boot (handy for demo/staging). Never overwrites
  // an existing vault, so a mounted staging volume survives restarts.
  if (process.env.ADAMAS_SEED === '1' && ctx.ledger.count === 0) {
    const seeded = await seedVault(root);
    console.log(`[adamas] seeded ${seeded.count} decisions into ${root}`);
    ctx = await createContext(root);
  }
  const app = buildApp(ctx);
  const served = await registerWebClient(app);

  const port = serverPort();
  const host = serverHost();
  await app.listen({ port, host });

  console.log(`[adamas] ${ADAMAS}`);
  console.log(`[adamas] vault:   ${root}`);
  console.log(`[adamas] ledger:  ${ctx.ledger.count} decisions`);
  console.log(`[adamas] web ui:  ${served ? 'served at /' : 'not built (run: npm run build:web)'}`);
  console.log(`[adamas] listening on http://${host}:${port}`);
}

main().catch((err) => {
  console.error('[adamas] failed to start', err);
  process.exit(1);
});
