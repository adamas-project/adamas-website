import type { Ledger } from '../ledger/ledger.js';
import type { KnowledgeStore } from '../knowledge/store.js';
import type { PeopleStore } from '../people/store.js';
import type { RecordStore } from '../records/store.js';
import type { GlossaryStore } from '../glossary/store.js';
import type { AssetEngine } from '../assets/engine.js';
import { buildObsidianVault, type ObsidianExportResult } from './export.js';

export interface ObsidianAutoDeps {
  ledger: Ledger;
  knowledge: KnowledgeStore;
  assets: AssetEngine;
  people?: PeopleStore;
  records?: RecordStore;
  glossary?: GlossaryStore;
}

/**
 * Keeps the derived Obsidian data-room vault in sync with the ADAMAS vault.
 * Subscribes to ledger + knowledge changes and rebuilds (debounced) so the
 * vault always mirrors the source of truth without anyone clicking "Generate".
 * Runs are serialized so a manual export and an auto-refresh never overlap and
 * clobber each other mid-write. Failures are logged, never thrown to callers of
 * the change events.
 */
export class ObsidianAutoExporter {
  private timer: NodeJS.Timeout | null = null;
  private unsubscribers: Array<() => void> = [];
  private running: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly deps: ObsidianAutoDeps,
    private readonly dir: string,
    private readonly debounceMs = 1500,
  ) {}

  start(): void {
    this.unsubscribers.push(this.deps.ledger.onChange(() => this.schedule()));
    this.unsubscribers.push(this.deps.knowledge.onChange(() => this.schedule()));
    if (this.deps.people) this.unsubscribers.push(this.deps.people.onChange(() => this.schedule()));
    if (this.deps.records) this.unsubscribers.push(this.deps.records.onChange(() => this.schedule()));
    if (this.deps.glossary) this.unsubscribers.push(this.deps.glossary.onChange(() => this.schedule()));
    // Mirror current state on boot so the vault exists and is fresh.
    this.schedule();
  }

  /** Debounced rebuild: collapse a burst of changes into one export. */
  schedule(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      this.runNow().catch((err) => {
        console.warn(`[obsidian] auto-export failed: ${(err as Error).message}`);
      });
    }, this.debounceMs);
    // Don't let a pending refresh keep the process (or a test) alive.
    this.timer.unref?.();
  }

  /** Run an export immediately, serialized behind any in-flight export. */
  runNow(): Promise<ObsidianExportResult> {
    const next = this.running.then(() => buildObsidianVault(this.deps, this.dir));
    // Keep the serialization chain alive regardless of this run's outcome.
    this.running = next.catch(() => undefined);
    return next;
  }

  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    for (const u of this.unsubscribers.splice(0)) u();
  }
}
