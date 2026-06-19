import type { AssetGroup, AssetKind } from './templates.js';

export interface GenerationHeader {
  /** Ledger version at generation time. */
  ledgerVersion: number;
  /** Total decisions in the ledger at generation time. */
  ledgerDecisionCount: number;
  /** Distinct source decisions this asset was built from. */
  sourceDecisionCount: number;
  generatedAt: string;
}

export interface GeneratedSection {
  key: string;
  heading: string;
  blurb?: string;
  /** SRC: the exact source decision ids this section was assembled from. */
  src: string[];
}

export interface GeneratedAsset {
  assetId: string;
  title: string;
  group: AssetGroup;
  kind: AssetKind;
  summary: string;
  wholeLedger: boolean;
  header: GenerationHeader;
  sections: GeneratedSection[];
  /** Rendered Markdown with section-level SRC tags. */
  markdown: string;
  /** Stale when any source decision changed since generation. */
  stale: boolean;
  staleReason?: string;
  staleSections: string[];
  /** Snapshot of source decision hashes at generation time (drives staleness). */
  snapshot: Record<string, string>;
}

export interface AssetRegistryEntry {
  id: string;
  title: string;
  group: AssetGroup;
  kind: AssetKind;
  summary: string;
  wholeLedger: boolean;
  generated: boolean;
  stale: boolean;
}
