import type { Domain } from '../schema/decision.schema.js';

// A source document pulled onto the local machine by a read-only connector.
// `ref` is the traceable reference recorded on any resulting decision.
export interface SourceDocument {
  ref: string; // e.g. "email:2025-04-02#thread-114"
  kind: 'email' | 'meeting' | 'doc' | 'chat';
  date: string; // ISO date
  title: string;
  text: string;
  /** Optional hint for the decision domain (e.g. from the connector/folder). */
  domainHint?: Domain;
}

// A proposed decision drafted by an evaluation provider. Maps onto the decision
// schema (minus the id, which is assigned by the ledger on confirmation).
export interface CandidateDraft {
  domain: Domain;
  date: string;
  title: string;
  context: string;
  decision: string;
  owner: { role: string; name?: string; dissent?: string[] };
  tradeoffs?: string[];
  sources: string[];
}

export interface Candidate {
  candidateId: string;
  draft: CandidateDraft;
  provider: string;
  /** Where this candidate came from. */
  source: { ref: string; kind: SourceDocument['kind']; date: string };
  /** 0..1 heuristic confidence. */
  confidence: number;
}

/** Where evaluation runs. The hard data boundary applies to `cloud`. */
export type ProviderLocation = 'local' | 'cloud';

/**
 * Hermes is a pluggable evaluation provider. The default runs entirely on the
 * local machine; an optional cloud provider is gated behind per-task approval.
 */
export interface LLMProvider {
  readonly id: string;
  readonly location: ProviderLocation;
  /** Extract candidate decisions ("the why / who / trade-offs") from a source. */
  extractCandidates(doc: SourceDocument): Promise<Omit<Candidate, 'candidateId'>[]>;
}
