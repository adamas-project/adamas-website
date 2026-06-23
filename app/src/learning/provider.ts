import type { Candidate, KnowledgeSynthesis, LLMProvider, ProviderLocation, SourceDocument } from '../evaluation/provider.js';
import { DOMAINS, type Domain } from '../schema/decision.schema.js';
import type { LearningStore } from './store.js';

// Wraps any provider and applies what ADAMAS has learned from your confirmations:
// when a new source strongly matches a confirmed example, nudge the extracted
// candidate toward the domain/owner you previously chose. Deterministic and
// conservative — it only acts on strong matches, so it improves accuracy without
// guessing. This is what makes the eval score climb as you correct things.
export class LearningProvider implements LLMProvider {
  readonly id: string;
  readonly location: ProviderLocation;
  summarize?: (text: string, opts?: { kind?: 'meeting' | 'article' }) => Promise<string>;
  synthesizeKnowledge?: (text: string) => Promise<KnowledgeSynthesis>;

  constructor(
    private readonly base: LLMProvider,
    private readonly store: LearningStore,
  ) {
    this.id = base.id;
    this.location = base.location;
    if (base.summarize) this.summarize = (t, o) => base.summarize!(t, o);
    if (base.synthesizeKnowledge) this.synthesizeKnowledge = (t) => base.synthesizeKnowledge!(t);
  }

  async extractCandidates(doc: SourceDocument): Promise<Omit<Candidate, 'candidateId'>[]> {
    const candidates = await this.base.extractCandidates(doc);
    const s = this.store.suggest(doc.text);
    const learnedDomain = (DOMAINS as readonly string[]).includes(s.domain ?? '') ? (s.domain as Domain) : undefined;
    if (!learnedDomain && !s.ownerRole) return candidates;

    return candidates.map((c) => {
      const owner = { ...c.draft.owner };
      if (s.ownerRole) owner.role = s.ownerRole;
      return {
        ...c,
        draft: { ...c.draft, domain: learnedDomain ?? c.draft.domain, owner },
        // A learned match is a real signal — reflect a little more confidence.
        confidence: Math.min(1, c.confidence + 0.1),
      };
    });
  }
}
