import type { Candidate, KnowledgeSynthesis, LLMProvider, ProviderLocation, SourceDocument } from './provider.js';

// The model router — "cheapest capable model, escalate only when needed".
// A fast/free primary (the deterministic heuristic) handles the easy majority;
// when it isn't confident enough, the router escalates to a stronger model (a
// local Ollama model). Both tiers run on-device, so this never crosses the data
// boundary — it just saves model calls (and credits) on the easy cases.
export interface RouterOptions {
  /** Escalate when the primary's best candidate confidence is below this. */
  minConfidence?: number;
}

function bestConfidence(cands: Omit<Candidate, 'candidateId'>[]): number {
  return cands.reduce((m, c) => Math.max(m, c.confidence), 0);
}

export class RouterLLMProvider implements LLMProvider {
  readonly id = 'router';
  readonly location: ProviderLocation;
  private readonly minConfidence: number;

  // Optional capabilities are delegated to whichever tier implements them
  // (preferring the stronger model). Assigned in the constructor so callers'
  // `provider.summarize?` / `synthesizeKnowledge?` checks stay accurate.
  summarize?: (text: string, opts?: { kind?: 'meeting' | 'article' }) => Promise<string>;
  synthesizeKnowledge?: (text: string) => Promise<KnowledgeSynthesis>;

  constructor(
    private readonly primary: LLMProvider,
    private readonly escalate: LLMProvider,
    opts: RouterOptions = {},
  ) {
    this.minConfidence = opts.minConfidence ?? 0.75;
    // If either tier is cloud, surface that (the boundary applies). Both local here.
    this.location = primary.location === 'cloud' || escalate.location === 'cloud' ? 'cloud' : 'local';

    const sum = escalate.summarize ?? primary.summarize;
    if (sum) this.summarize = (text, o) => (escalate.summarize ?? primary.summarize)!.call(escalate.summarize ? escalate : primary, text, o);
    const syn = escalate.synthesizeKnowledge ?? primary.synthesizeKnowledge;
    if (syn) this.synthesizeKnowledge = (text) => (escalate.synthesizeKnowledge ?? primary.synthesizeKnowledge)!.call(escalate.synthesizeKnowledge ? escalate : primary, text);
  }

  async extractCandidates(doc: SourceDocument): Promise<Omit<Candidate, 'candidateId'>[]> {
    const first = await this.primary.extractCandidates(doc);
    const firstBest = bestConfidence(first);
    // Confident enough on the cheap tier — done, no model call.
    if (first.length > 0 && firstBest >= this.minConfidence) return first;

    // Escalate: spend the stronger model only on the uncertain cases.
    const second = await this.escalate.extractCandidates(doc);
    const secondBest = bestConfidence(second);
    if (second.length > first.length || secondBest > firstBest) return second;
    return first.length ? first : second;
  }
}
