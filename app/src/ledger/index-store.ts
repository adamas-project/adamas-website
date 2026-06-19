import path from 'node:path';
import type { Decision, Domain, Status } from '../schema/decision.schema.js';
import { parseDecision } from './markdown.js';
import { fileName as buildFileName } from './ids.js';
import {
  atomicWrite,
  listDecisionFiles,
  readText,
  type VaultPaths,
} from './storage.js';

export interface IndexEntry {
  decision: Decision;
  fileName: string;
}

/** A lightweight, derived summary record persisted to index.json. */
export interface IndexRecord {
  id: string;
  domain: Domain;
  date: string;
  title: string;
  status: Status;
  links: string[];
  superseded_by?: string;
  fileName: string;
}

/**
 * The query index. It is a *derived* artifact: the Markdown files are the source
 * of truth, and `rebuild()` reconstructs the index from them at any time. This
 * pure-TS implementation has zero native dependencies; a SQLite-backed index can
 * be dropped in behind the same surface.
 */
export class LedgerIndex {
  private map = new Map<string, IndexEntry>();
  private version = 0;

  constructor(private readonly paths: VaultPaths) {}

  get ledgerVersion(): number {
    return this.version;
  }

  get count(): number {
    return this.map.size;
  }

  bumpVersion(): number {
    this.version += 1;
    return this.version;
  }

  has(id: string): boolean {
    return this.map.has(id);
  }

  get(id: string): IndexEntry | undefined {
    return this.map.get(id);
  }

  getDecision(id: string): Decision | undefined {
    return this.map.get(id)?.decision;
  }

  ids(): string[] {
    return [...this.map.keys()];
  }

  all(): Decision[] {
    return [...this.map.values()].map((e) => e.decision);
  }

  set(decision: Decision): IndexEntry {
    const fileName = buildFileName(decision.id, decision.title);
    const entry: IndexEntry = { decision, fileName };
    this.map.set(decision.id, entry);
    return entry;
  }

  /** Rebuild the entire index from the Markdown files on disk. */
  async rebuild(): Promise<void> {
    this.map.clear();
    const files = await listDecisionFiles(this.paths);
    for (const file of files) {
      const text = await readText(file);
      const decision = parseDecision(text);
      this.map.set(decision.id, { decision, fileName: path.basename(file) });
    }
    await this.loadMeta();
  }

  private async loadMeta(): Promise<void> {
    try {
      const raw = await readText(this.paths.meta);
      const meta = JSON.parse(raw) as { version?: number };
      if (typeof meta.version === 'number') this.version = meta.version;
    } catch {
      this.version = 0;
    }
  }

  toRecords(): IndexRecord[] {
    return [...this.map.values()]
      .map(({ decision: d, fileName }) => ({
        id: d.id,
        domain: d.domain,
        date: d.date,
        title: d.title,
        status: d.status ?? 'active',
        links: d.links ?? [],
        ...(d.superseded_by ? { superseded_by: d.superseded_by } : {}),
        fileName,
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  /** Persist the derived index.json and meta.json (both rebuildable). */
  async persist(): Promise<void> {
    const payload = {
      generated_at: new Date().toISOString(),
      version: this.version,
      count: this.map.size,
      decisions: this.toRecords(),
    };
    await atomicWrite(this.paths.index, JSON.stringify(payload, null, 2));
    await atomicWrite(this.paths.meta, JSON.stringify({ version: this.version }, null, 2));
  }
}
