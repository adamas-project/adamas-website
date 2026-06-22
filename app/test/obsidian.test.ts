import { describe, it, expect, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { AssetEngine } from '../src/assets/engine.js';
import { KnowledgeStore } from '../src/knowledge/store.js';
import { seedVault } from '../src/seed/seed.js';
import { vaultPaths } from '../src/ledger/storage.js';
import { buildObsidianVault } from '../src/obsidian/export.js';
import { computeReadiness } from '../src/obsidian/readiness.js';
import { tempVault } from './helpers.js';

const cleanups: Array<() => void> = [];
const engines: AssetEngine[] = [];
afterEach(async () => {
  while (engines.length) await engines.pop()!.close();
  while (cleanups.length) cleanups.pop()!();
});

async function setup() {
  const { root, cleanup } = tempVault();
  cleanups.push(cleanup);
  const ledger = await seedVault(root);
  const assets = await AssetEngine.open(ledger, vaultPaths(root).assets);
  engines.push(assets);
  const knowledge = await KnowledgeStore.open(path.join(root, 'knowledge'));
  return { root, ledger, assets, knowledge };
}

describe('readiness scorecard', () => {
  it('scores the seeded vault and reports full domain coverage', async () => {
    const { ledger, knowledge } = await setup();
    const r = computeReadiness(ledger, knowledge);
    expect(r.decisions).toBe(14);
    expect(r.domainGaps).toEqual([]); // seed covers all 5 domains
    expect(r.traceabilityPct).toBeGreaterThan(0);
    expect(r.score).toBeGreaterThan(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });
});

describe('obsidian export', () => {
  it('generates an Obsidian-native data-room vault', async () => {
    const { root, ledger, assets, knowledge } = await setup();
    await knowledge.create({ title: 'Local-first', source: 'https://ex.com', type: 'article', summary: 'why', tags: ['arch'] });

    const out = path.join(root, 'obsidian');
    const result = await buildObsidianVault({ ledger, knowledge, assets }, out);

    expect(result.decisions).toBe(14);
    expect(result.knowledge).toBe(1);
    expect(result.files).toBeGreaterThan(10);

    // Top-level cockpit + scorecard exist.
    expect(await fs.readFile(path.join(out, '00 - Index.md'), 'utf8')).toMatch(/ADAMAS Data Room/);
    expect(await fs.readFile(path.join(out, 'Valuation Readiness.md'), 'utf8')).toMatch(/Readiness score/);

    // A decision note has YAML frontmatter, an alias, and wikilinks.
    const sal = await fs.readFile(
      path.join(out, 'Decisions', 'Sales & Revenue', 'SAL-021 — Decline the automotive OEM frame contract.md'),
      'utf8',
    );
    expect(sal.startsWith('---\n')).toBe(true);
    expect(sal).toMatch(/aliases: \["SAL-021"\]/);
    expect(sal).toMatch(/\[\[FIN-016\]\]/); // bi-directional link rendered as a wikilink

    // Diligence binder was generated into the vault.
    const di = await fs.readFile(path.join(out, 'Diligence', 'Diligence MOC.md'), 'utf8');
    expect(di).toMatch(/Decision Diligence Binder/);

    // Knowledge MOC links the entry.
    expect(await fs.readFile(path.join(out, 'Knowledge', 'Knowledge MOC.md'), 'utf8')).toMatch(/\[\[KNW-001\]\]/);
  });

  it('regenerates cleanly (idempotent)', async () => {
    const { root, ledger, assets, knowledge } = await setup();
    const out = path.join(root, 'obsidian');
    const a = await buildObsidianVault({ ledger, knowledge, assets }, out);
    const b = await buildObsidianVault({ ledger, knowledge, assets }, out);
    expect(b.files).toBe(a.files);
  });
});
