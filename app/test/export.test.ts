import { describe, it, expect, afterEach } from 'vitest';
import { Ledger } from '../src/ledger/ledger.js';
import { exportVault, importVault } from '../src/ledger/export.js';
import { tempVault, sampleInput } from './helpers.js';

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
});

describe('export / import round-trip', () => {
  it('reproduces every decision exactly through a fresh vault', async () => {
    const v1 = tempVault();
    cleanups.push(v1.cleanup);
    const l1 = await Ledger.open(v1.root);
    const a = await l1.create(sampleInput({ domain: 'sales' }));
    const b = await l1.create(sampleInput({ domain: 'finance', owner: { role: 'cfo', dissent: ['founder'] } }));
    await l1.update(a.id, { links: [b.id], tradeoffs: ['gave up volume'] });

    const bundle = exportVault(l1);
    expect(bundle.count).toBe(2);
    expect(Object.keys(bundle.markdown)).toHaveLength(2);

    const v2 = tempVault();
    cleanups.push(v2.cleanup);
    const l2 = await importVault(v2.root, bundle);

    expect(l2.list()).toEqual(l1.list());
    expect(l2.getOrThrow(a.id).links).toContain(b.id);
    expect(l2.getOrThrow(b.id).owner.dissent).toContain('founder');
    expect(l2.linkSymmetryViolations()).toHaveLength(0);
  });
});
