import { describe, it, expect, afterEach } from 'vitest';
import { Ledger } from '../src/ledger/ledger.js';
import { tempVault, sampleInput } from './helpers.js';

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
});

async function freshLedger(): Promise<Ledger> {
  const { root, cleanup } = tempVault();
  cleanups.push(cleanup);
  return Ledger.open(root);
}

describe('ledger create + read', () => {
  it('auto-generates ids from the domain prefix', async () => {
    const l = await freshLedger();
    const a = await l.create(sampleInput({ domain: 'sales' }));
    const b = await l.create(sampleInput({ domain: 'sales', title: 'Second sales call' }));
    expect(a.id).toBe('SAL-001');
    expect(b.id).toBe('SAL-002');
    expect(a.status).toBe('active');
  });

  it('rejects an id whose prefix does not match the domain', async () => {
    const l = await freshLedger();
    await expect(l.create(sampleInput({ id: 'FIN-001', domain: 'sales' }))).rejects.toThrow();
  });

  it('never overwrites an existing id', async () => {
    const l = await freshLedger();
    await l.create(sampleInput({ id: 'SAL-001' }));
    await expect(l.create(sampleInput({ id: 'SAL-001' }))).rejects.toThrow();
  });

  it('filters by domain and status', async () => {
    const l = await freshLedger();
    await l.create(sampleInput({ domain: 'sales' }));
    await l.create(sampleInput({ domain: 'finance', owner: { role: 'cfo' } }));
    expect(l.list({ domain: 'sales' })).toHaveLength(1);
    expect(l.list({ domain: 'finance' })).toHaveLength(1);
    expect(l.list()).toHaveLength(2);
  });
});

describe('bi-directional links (principle #4)', () => {
  it('adds the reverse link atomically when A links B', async () => {
    const l = await freshLedger();
    const a = await l.create(sampleInput({ domain: 'sales' }));
    const b = await l.create(sampleInput({ domain: 'finance', owner: { role: 'cfo' } }));
    await l.update(a.id, { links: [b.id] });
    expect(l.getOrThrow(a.id).links).toContain(b.id);
    expect(l.getOrThrow(b.id).links).toContain(a.id);
    expect(l.linkSymmetryViolations()).toHaveLength(0);
  });

  it('removes the reverse link when the forward link is removed', async () => {
    const l = await freshLedger();
    const a = await l.create(sampleInput({ domain: 'sales' }));
    const b = await l.create(sampleInput({ domain: 'finance', owner: { role: 'cfo' } }));
    await l.update(a.id, { links: [b.id] });
    await l.update(a.id, { links: [] });
    expect(l.getOrThrow(a.id).links ?? []).not.toContain(b.id);
    expect(l.getOrThrow(b.id).links ?? []).not.toContain(a.id);
  });

  it('rejects linking to a non-existent decision', async () => {
    const l = await freshLedger();
    const a = await l.create(sampleInput());
    await expect(l.update(a.id, { links: ['FIN-999'] })).rejects.toThrow();
  });

  it('drops self-links', async () => {
    const l = await freshLedger();
    const a = await l.create(sampleInput());
    const updated = await l.update(a.id, { links: [a.id] });
    expect(updated.links ?? []).not.toContain(a.id);
  });
});

describe('status transitions + never-delete (principles #1)', () => {
  it('supersede keeps the original, sets status + successor, and links both ways', async () => {
    const l = await freshLedger();
    const orig = await l.create(sampleInput({ title: 'Original choice' }));
    const { original, successor } = await l.supersede(orig.id, sampleInput({ title: 'New choice' }));
    expect(original.status).toBe('superseded');
    expect(original.superseded_by).toBe(successor.id);
    expect(original.links).toContain(successor.id);
    expect(successor.links).toContain(original.id);
    // never deleted: still present and listed
    expect(l.get(orig.id)).toBeDefined();
    expect(l.list().map((d) => d.id)).toContain(orig.id);
  });

  it('reverse behaves like supersede with reversed status', async () => {
    const l = await freshLedger();
    const orig = await l.create(sampleInput());
    const { original } = await l.reverse(orig.id, sampleInput({ title: 'Reversal' }));
    expect(original.status).toBe('reversed');
  });

  it('cannot supersede itself', async () => {
    const l = await freshLedger();
    const a = await l.create(sampleInput());
    await expect(l.setStatus(a.id, 'superseded', a.id)).rejects.toThrow();
  });

  it('requires a successor for superseded/reversed', async () => {
    const l = await freshLedger();
    const a = await l.create(sampleInput());
    await expect(l.setStatus(a.id, 'superseded')).rejects.toThrow();
  });

  it('does not expose any delete operation', async () => {
    const l = await freshLedger();
    expect((l as unknown as Record<string, unknown>).delete).toBeUndefined();
    expect((l as unknown as Record<string, unknown>).remove).toBeUndefined();
  });

  it('preserves dissent through updates (principle #3)', async () => {
    const l = await freshLedger();
    const a = await l.create(sampleInput({ owner: { role: 'founder', dissent: ['head-of-ops'] } }));
    const updated = await l.update(a.id, { decision: 'Revised wording of the same choice.' });
    expect(updated.owner.dissent).toContain('head-of-ops');
  });
});

describe('index rebuild + persistence', () => {
  it('rebuilds the index from the Markdown files (files are source of truth)', async () => {
    const { root, cleanup } = tempVault();
    cleanups.push(cleanup);
    const l1 = await Ledger.open(root);
    const a = await l1.create(sampleInput({ domain: 'sales' }));
    const b = await l1.create(sampleInput({ domain: 'finance', owner: { role: 'cfo' } }));
    await l1.update(a.id, { links: [b.id] });

    // Reopen: index is rebuilt purely from files.
    const l2 = await Ledger.open(root);
    expect(l2.count).toBe(2);
    expect(l2.getOrThrow(a.id).links).toContain(b.id);
    expect(l2.getOrThrow(b.id).links).toContain(a.id);
    expect(l2.linkSymmetryViolations()).toHaveLength(0);
  });
});
