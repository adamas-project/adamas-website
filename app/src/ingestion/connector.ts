import type { SourceDocument } from '../evaluation/provider.js';

// Ingestion connectors are READ-ONLY and INBOUND by contract: they only pull
// source material onto the local machine and never push anything out. A cursor
// makes pulls incremental and resumable (only new/changed material is returned).

export type ConnectorKind = 'filesystem' | 'imap' | 'http';

export interface ConnectorInfo {
  id: string;
  label: string;
  kind: ConnectorKind;
  /** Always true — connectors never write to the source system. */
  readOnly: true;
  /** Whether this connector reaches the network (false = fully local). */
  network: boolean;
  /** Human-readable location (e.g. the watched folder). */
  location: string;
  configured: boolean;
}

export type Cursor = Record<string, string>;

export interface PullResult {
  documents: SourceDocument[];
  scanned: number;
  /** Items skipped because they were unchanged since the last pull. */
  skipped: number;
}

export interface Connector {
  readonly info: ConnectorInfo;
  /**
   * Pull new/changed source documents given the previous cursor. Returns the
   * documents plus the updated cursor (persisted by the manager). Pure read:
   * it must never modify the source system.
   */
  pull(cursor: Cursor): Promise<{ result: PullResult; cursor: Cursor }>;
}
