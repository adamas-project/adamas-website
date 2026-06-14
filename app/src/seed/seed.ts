import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Ledger } from '../ledger/ledger.js';
import { resolveVaultRoot } from '../config/env.js';
import { SEED_DECISIONS } from './data.js';

/**
 * Seed a vault with the 14-decision sample ledger. Idempotent: clears the
 * decisions directory first so re-seeding produces a clean, deterministic vault.
 * (The never-delete principle governs the running app, not this bootstrap tool.)
 */
export async function seedVault(root: string): Promise<Ledger> {
  // Clear prior decision files + derived artifacts for a clean seed.
  await fs.rm(path.join(root, 'decisions'), { recursive: true, force: true });
  await fs.rm(path.join(root, 'index.json'), { force: true });
  await fs.rm(path.join(root, 'meta.json'), { force: true });
  await fs.rm(path.join(root, 'candidates.json'), { force: true });

  const ledger = await Ledger.open(root);

  // Pass 1: create every decision without links (targets must exist to link).
  for (const input of SEED_DECISIONS) {
    const { links: _links, ...withoutLinks } = input;
    void _links;
    await ledger.create(withoutLinks);
  }

  // Pass 2: apply links now that all targets exist (reverse links auto-added).
  for (const input of SEED_DECISIONS) {
    if (input.links && input.links.length > 0 && input.id) {
      const current = ledger.getOrThrow(input.id);
      const merged = [...new Set([...(current.links ?? []), ...input.links])];
      await ledger.update(input.id, { links: merged });
    }
  }

  return ledger;
}

// Run directly: `npm run seed`
if (import.meta.url === `file://${process.argv[1]}`) {
  const root = resolveVaultRoot();
  seedVault(root)
    .then((ledger) => {
      const violations = ledger.linkSymmetryViolations();
      console.log(`Seeded ${ledger.count} decisions into ${root}`);
      console.log(`Link symmetry violations: ${violations.length}`);
      if (violations.length > 0) {
        console.error(violations);
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
