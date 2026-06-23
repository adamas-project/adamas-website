import { describe, it, expect } from 'vitest';
import { RouterLLMProvider } from '../src/evaluation/router.js';
import type { Candidate, LLMProvider, SourceDocument } from '../src/evaluation/provider.js';

const doc: SourceDocument = { ref: 'x', kind: 'doc', date: '2026-01-01', title: '', text: 'We decided X.' };

function fakeProvider(id: string, confidence: number, count = 1): LLMProvider & { calls: number } {
  const p = {
    id,
    location: 'local' as const,
    calls: 0,
    async extractCandidates(): Promise<Omit<Candidate, 'candidateId'>[]> {
      p.calls += 1;
      return Array.from({ length: count }, () => ({
        draft: {
          domain: 'ops' as const,
          date: '2026-01-01',
          title: `from ${id}`,
          context: 'c',
          decision: 'd',
          owner: { role: 'head-of-ops' },
          sources: ['x'],
        },
        provider: id,
        source: { ref: 'x', kind: 'doc' as const, date: '2026-01-01' },
        confidence,
      }));
    },
  };
  return p;
}

describe('RouterLLMProvider — cheap-first, escalate when unsure', () => {
  it('does NOT escalate when the primary is confident enough', async () => {
    const primary = fakeProvider('local', 0.9);
    const escalate = fakeProvider('ollama', 0.7);
    const router = new RouterLLMProvider(primary, escalate, { minConfidence: 0.75 });

    const out = await router.extractCandidates(doc);
    expect(out[0]!.provider).toBe('local');
    expect(escalate.calls).toBe(0); // no model call spent
  });

  it('escalates to the stronger model when the primary is unsure', async () => {
    const primary = fakeProvider('local', 0.5);
    const escalate = fakeProvider('ollama', 0.8);
    const router = new RouterLLMProvider(primary, escalate, { minConfidence: 0.75 });

    const out = await router.extractCandidates(doc);
    expect(escalate.calls).toBe(1);
    expect(out[0]!.provider).toBe('ollama');
  });

  it('escalates when the primary finds nothing', async () => {
    const primary = fakeProvider('local', 0, 0); // empty
    const escalate = fakeProvider('ollama', 0.6);
    const router = new RouterLLMProvider(primary, escalate, { minConfidence: 0.75 });

    const out = await router.extractCandidates(doc);
    expect(escalate.calls).toBe(1);
    expect(out.length).toBe(1);
  });

  it('exposes summarize/synthesizeKnowledge only when a tier provides them', () => {
    const bare = new RouterLLMProvider(fakeProvider('a', 1), fakeProvider('b', 1));
    expect(bare.summarize).toBeUndefined();

    const withCaps = new RouterLLMProvider(fakeProvider('a', 1), {
      ...fakeProvider('b', 1),
      summarize: async () => 'sum',
      synthesizeKnowledge: async () => ({ summary: 's', takeaways: [], tags: [] }),
    });
    expect(typeof withCaps.summarize).toBe('function');
    expect(typeof withCaps.synthesizeKnowledge).toBe('function');
  });
});
