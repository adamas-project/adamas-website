import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';

// Filesystem layout for a vault. The decisions directory holds the canonical
// Markdown files; everything else is derived or auxiliary and can be rebuilt.
export interface VaultPaths {
  root: string;
  decisions: string;
  assets: string;
  index: string;
  candidates: string;
  meta: string;
  backups: string;
}

export function vaultPaths(root: string): VaultPaths {
  return {
    root,
    decisions: path.join(root, 'decisions'),
    assets: path.join(root, 'assets'),
    index: path.join(root, 'index.json'),
    candidates: path.join(root, 'candidates.json'),
    meta: path.join(root, 'meta.json'),
    backups: path.join(root, 'backups'),
  };
}

export async function ensureVault(paths: VaultPaths): Promise<void> {
  await fs.mkdir(paths.decisions, { recursive: true });
  await fs.mkdir(paths.assets, { recursive: true });
  await fs.mkdir(paths.backups, { recursive: true });
}

/** Atomic write: write to a temp file in the same dir, then rename over target. */
export async function atomicWrite(filePath: string, contents: string): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const tmp = path.join(dir, `.tmp-${randomBytes(8).toString('hex')}`);
  await fs.writeFile(tmp, contents, 'utf8');
  await fs.rename(tmp, filePath);
}

export async function readText(filePath: string): Promise<string> {
  return fs.readFile(filePath, 'utf8');
}

export async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function listDecisionFiles(paths: VaultPaths): Promise<string[]> {
  await fs.mkdir(paths.decisions, { recursive: true });
  const entries = await fs.readdir(paths.decisions);
  return entries.filter((f) => f.endsWith('.md')).map((f) => path.join(paths.decisions, f)).sort();
}

export async function removeFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch {
    /* already gone */
  }
}
