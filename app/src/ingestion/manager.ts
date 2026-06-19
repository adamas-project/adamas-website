import { atomicWrite, readText } from '../ledger/storage.js';
import type { Connector, ConnectorInfo, Cursor, PullResult } from './connector.js';

// Holds the configured connectors and persists their cursors so pulls are
// incremental across restarts (resume on reconnect).
export class ConnectorManager {
  private cursors: Record<string, Cursor> = {};

  private constructor(
    private readonly cursorPath: string,
    private readonly connectors: Connector[],
  ) {}

  static async open(cursorPath: string, connectors: Connector[]): Promise<ConnectorManager> {
    const mgr = new ConnectorManager(cursorPath, connectors);
    try {
      const raw = await readText(cursorPath);
      mgr.cursors = (JSON.parse(raw) as { cursors?: Record<string, Cursor> }).cursors ?? {};
    } catch {
      mgr.cursors = {};
    }
    return mgr;
  }

  list(): ConnectorInfo[] {
    return this.connectors.map((c) => c.info);
  }

  get(id: string): Connector | undefined {
    return this.connectors.find((c) => c.info.id === id);
  }

  /** Pull from a connector, advancing and persisting its cursor. */
  async pull(id: string): Promise<PullResult> {
    const connector = this.get(id);
    if (!connector) throw new Error(`No connector ${id}`);
    const { result, cursor } = await connector.pull(this.cursors[id] ?? {});
    this.cursors[id] = cursor;
    await this.persist();
    return result;
  }

  private async persist(): Promise<void> {
    await atomicWrite(this.cursorPath, JSON.stringify({ version: 1, cursors: this.cursors }, null, 2));
  }
}
