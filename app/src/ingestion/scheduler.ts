import type { ConnectorManager } from './manager.js';
import type { CaptureInbox } from '../evaluation/inbox.js';
import type { LLMProvider } from '../evaluation/provider.js';

/**
 * Periodically pulls every read-only connector and feeds new source material
 * through Hermes into the Capture Inbox — so the inbox fills itself without
 * anyone clicking "Pull". Read-only and inbound only (same guarantees as a
 * manual pull); nothing enters the ledger unreviewed. Runs are serialized,
 * failures are logged (one bad connector never blocks the others), and the
 * timer is unref'd so it never keeps the process alive.
 */
export class ConnectorScheduler {
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly mgr: ConnectorManager,
    private readonly inbox: CaptureInbox,
    private readonly provider: LLMProvider,
    private readonly intervalMs: number,
  ) {}

  start(): void {
    if (this.intervalMs <= 0) return;
    this.timer = setInterval(() => {
      void this.runOnce().catch((err) => {
        console.warn(`[connectors] auto-pull cycle failed: ${(err as Error).message}`);
      });
    }, this.intervalMs);
    this.timer.unref?.();
  }

  /** Pull every connector once, ingesting new documents. Serialized (no overlap). */
  async runOnce(): Promise<{ pulled: number; added: number }> {
    if (this.running) return { pulled: 0, added: 0 };
    this.running = true;
    let pulled = 0;
    let added = 0;
    try {
      for (const info of this.mgr.list()) {
        try {
          const result = await this.mgr.pull(info.id);
          pulled += result.documents.length;
          const a = await this.inbox.ingest(this.provider, result.documents);
          added += a.length;
        } catch (err) {
          console.warn(`[connectors] auto-pull ${info.id} failed: ${(err as Error).message}`);
        }
      }
    } finally {
      this.running = false;
    }
    return { pulled, added };
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
