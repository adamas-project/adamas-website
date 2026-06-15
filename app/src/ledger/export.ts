import path from 'node:path';
import { promises as fs } from 'node:fs';
import type { Decision } from '../schema/decision.schema.js';
import { Ledger } from './ledger.js';
import { serializeDecision } from './markdown.js';
import { fileName as buildFileName } from './ids.js';
import { atomicWrite, ensureVault, vaultPaths } from './storage.js';

export const EXPORT_FORMAT_VERSION = 1;

export interface VaultExport {
  format: 'adamas-vault';
  version: number;
  exported_at: string;
  count: number;
  /** Canonical JSON records. */
  decisions: Decision[];
  /** Human-readable Markdown files keyed by filename, for full portability. */
  markdown: Record<string, string>;
}

/** Export the entire vault as a portable Markdown + JSON bundle. */
export function exportVault(ledger: Ledger): VaultExport {
  const decisions = ledger.list();
  const markdown: Record<string, string> = {};
  for (const d of decisions) {
    markdown[buildFileName(d.id, d.title)] = serializeDecision(d);
  }
  return {
    format: 'adamas-vault',
    version: EXPORT_FORMAT_VERSION,
    exported_at: new Date().toISOString(),
    count: decisions.length,
    decisions,
    markdown,
  };
}

/** Write the export bundle as a single JSON file. */
export async function writeExportFile(ledger: Ledger, filePath: string): Promise<void> {
  await atomicWrite(filePath, JSON.stringify(exportVault(ledger), null, 2));
}

/**
 * Import a bundle into a fresh vault root by materializing its Markdown files,
 * then opening a ledger over it (which rebuilds the index from the files).
 */
export async function importVault(root: string, bundle: VaultExport): Promise<Ledger> {
  if (bundle.format !== 'adamas-vault') throw new Error('Not an ADAMAS vault export.');
  const paths = vaultPaths(root);
  await ensureVault(paths);
  // Prefer the canonical Markdown if present; otherwise reserialize from JSON.
  if (bundle.markdown && Object.keys(bundle.markdown).length > 0) {
    for (const [name, content] of Object.entries(bundle.markdown)) {
      await atomicWrite(path.join(paths.decisions, name), content);
    }
  } else {
    for (const d of bundle.decisions) {
      await atomicWrite(path.join(paths.decisions, buildFileName(d.id, d.title)), serializeDecision(d));
    }
  }
  const ledger = await Ledger.open(root);
  await ledger.rebuildIndex();
  return ledger;
}

export async function readExportFile(filePath: string): Promise<VaultExport> {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw) as VaultExport;
}
