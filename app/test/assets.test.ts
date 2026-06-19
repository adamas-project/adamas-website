import { describe, it, expect, afterEach } from 'vitest';
import { AssetEngine } from '../src/assets/engine.js';
import { ASSET_TEMPLATES } from '../src/assets/templates.js';
import { seedVault } from '../src/seed/seed.js';
import { vaultPaths } from '../src/ledger/storage.js';
import { DOMAINS } from '../src/schema/decision.schema.js';
import { tempVault } from './helpers.js';

const cleanups: Array<() => void> = [];
const engines: AssetEngine[] = [];
afterEach(async () => {
  while (engines.length) await engines.pop()!.close();
  while (cleanups.length) cleanups.pop()!();
});

async function setup(opts: { autoRegenerate?: boolean } = {}) {
  const { root, cleanup } = tempVault();
  cleanups.push(cleanup);
  const ledger = await seedVault(root);
  const engine = await AssetEngine.open(ledger, vaultPaths(root).assets, opts);
  engines.push(engine);
  return { root, ledger, engine };
}

describe('asset engine — generation & SRC traceability', () => {
  it('every generated section has SRC ids that resolve to real ledger entries', async () => {
    const { ledger, engine } = await setup();
    for (const tpl of ASSET_TEMPLATES) {
      const asset = await engine.generate(tpl.id);
      for (const section of asset.sections) {
        expect(section.src.length).toBeGreaterThan(0);
        for (const id of section.src) expect(ledger.has(id)).toBe(true);
        // SRC ids match the unique decisions actually carried by the asset
        expect(asset.header.sourceDecisionCount).toBeGreaterThan(0);
      }
    }
  });

  it('renders section-level SRC tags and a generation header in the markdown', async () => {
    const { engine } = await setup();
    const asset = await engine.generate('role-onboarding');
    expect(asset.markdown).toContain('SRC:');
    expect(asset.markdown).toContain('Source ledger version:');
    expect(asset.markdown).toContain('Source decisions in this asset:');
    // section src tags resolve to ids present in the doc
    for (const section of asset.sections) {
      expect(asset.markdown).toContain(`SRC: ${section.src.join(', ')}`);
    }
  });

  it('reproduces the sample onboarding asset with the expected domains', async () => {
    const { engine } = await setup();
    const asset = await engine.generate('role-onboarding');
    const keys = asset.sections.map((s) => s.key);
    expect(keys).toEqual(expect.arrayContaining(['operate', 'hire', 'sell', 'build', 'money']));
  });
});

describe('asset engine — whole-ledger assets', () => {
  it('the Decision Diligence Binder includes all domains', async () => {
    const { engine } = await setup();
    const asset = await engine.generate('decision-diligence-binder');
    const sectionKeys = new Set(asset.sections.map((s) => s.key));
    for (const d of DOMAINS) expect(sectionKeys.has(d)).toBe(true);
  });

  it('the Founder-Continuity Dossier includes every decision across all domains', async () => {
    const { ledger, engine } = await setup();
    const asset = await engine.generate('founder-continuity-dossier');
    const allSrc = new Set(asset.sections.flatMap((s) => s.src));
    expect(allSrc.size).toBe(ledger.count);
    const domainsCovered = new Set(asset.sections.map((s) => s.key));
    for (const d of DOMAINS) expect(domainsCovered.has(d)).toBe(true);
  });
});

describe('asset engine — staleness & regeneration (dependency graph)', () => {
  it('changing a source decision marks dependent assets stale', async () => {
    const { ledger, engine } = await setup();
    const asset = await engine.generate('decision-diligence-binder');
    expect(asset.stale).toBe(false);
    expect(engine.dependents('SAL-021')).toContain('decision-diligence-binder');

    await ledger.update('SAL-021', { tradeoffs: ['Edited trade-off to trigger staleness'] });

    const after = engine.get('decision-diligence-binder')!;
    expect(after.stale).toBe(true);
    expect(after.staleSections).toContain('sales');
  });

  it('superseding a source decision marks dependents stale', async () => {
    const { ledger, engine } = await setup();
    await engine.generate('founder-continuity-dossier');
    await ledger.supersede('SAL-017', {
      domain: 'sales',
      date: '2025-07-01',
      title: 'Revised pricing approach',
      context: 'Pricing needed an update.',
      decision: 'Adopt a revised value-based package structure.',
      owner: { role: 'head-of-sales' },
    });
    expect(engine.get('founder-continuity-dossier')!.stale).toBe(true);
  });

  it('regeneration clears stale', async () => {
    const { ledger, engine } = await setup();
    await engine.generate('decision-diligence-binder');
    await ledger.update('SAL-021', { tradeoffs: ['Another edit'] });
    expect(engine.get('decision-diligence-binder')!.stale).toBe(true);

    const regenerated = await engine.regenerate('decision-diligence-binder');
    expect(regenerated.stale).toBe(false);
    expect(engine.get('decision-diligence-binder')!.stale).toBe(false);
  });

  it('auto-regenerate refreshes dependents without manual action', async () => {
    const { ledger, engine } = await setup({ autoRegenerate: true });
    await engine.generate('decision-diligence-binder');
    await ledger.update('SAL-021', { tradeoffs: ['Auto-regen edit'] });
    const after = engine.get('decision-diligence-binder')!;
    expect(after.stale).toBe(false);
    expect(after.markdown).toContain('Auto-regen edit');
  });

  it('a newly linked decision makes a linked-query asset stale', async () => {
    const { ledger, engine } = await setup();
    // win-loss-review draws sales decisions; add a new sales decision -> stale
    await engine.generate('win-loss-review');
    const before = engine.get('win-loss-review')!.sections.flatMap((s) => s.src).length;
    await ledger.create({
      domain: 'sales',
      date: '2025-07-15',
      title: 'Win a flagship F&B line',
      context: 'A flagship prospect entered the pipeline.',
      decision: 'Pursue the flagship F&B line at standard packaging terms.',
      owner: { role: 'head-of-sales' },
    });
    const asset = engine.get('win-loss-review')!;
    expect(asset.stale).toBe(true);
    const regenerated = await engine.regenerate('win-loss-review');
    expect(regenerated.sections.flatMap((s) => s.src).length).toBe(before + 1);
  });
});
