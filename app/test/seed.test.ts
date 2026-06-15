import { describe, it, expect, afterEach } from 'vitest';
import { seedVault } from '../src/seed/seed.js';
import { DOMAINS } from '../src/schema/decision.schema.js';
import { tempVault } from './helpers.js';

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
});

describe('seed ledger', () => {
  it('creates 14 decisions across all domains with symmetric links', async () => {
    const { root, cleanup } = tempVault();
    cleanups.push(cleanup);
    const ledger = await seedVault(root);

    expect(ledger.count).toBe(14);
    expect(ledger.linkSymmetryViolations()).toHaveLength(0);

    const presentDomains = new Set(ledger.list().map((d) => d.domain));
    for (const domain of DOMAINS) expect(presentDomains.has(domain)).toBe(true);
  });

  it('includes SAL-021 linked bi-directionally to FIN-016, SAL-017, OPS-020, PRD-019', async () => {
    const { root, cleanup } = tempVault();
    cleanups.push(cleanup);
    const ledger = await seedVault(root);

    const sal021 = ledger.getOrThrow('SAL-021');
    expect(sal021.title).toMatch(/decline the automotive oem frame contract/i);
    for (const target of ['FIN-016', 'SAL-017', 'OPS-020', 'PRD-019']) {
      expect(sal021.links).toContain(target);
      expect(ledger.getOrThrow(target).links).toContain('SAL-021');
    }
    // dissent recorded (principle #3)
    expect(sal021.owner.dissent).toContain('head-of-sales');
  });

  it('re-seeding is idempotent (still 14, not 28)', async () => {
    const { root, cleanup } = tempVault();
    cleanups.push(cleanup);
    await seedVault(root);
    const ledger = await seedVault(root);
    expect(ledger.count).toBe(14);
  });
});
