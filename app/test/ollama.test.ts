import { describe, it, expect, afterEach, vi } from 'vitest';
import { OllamaLLMProvider } from '../src/evaluation/ollama.js';
import { validateDecision } from '../src/schema/validate.js';
import { DOMAIN_PREFIX } from '../src/schema/decision.schema.js';
import type { SourceDocument } from '../src/evaluation/provider.js';

const DOC: SourceDocument = {
  ref: 'meeting:2025-06-02#weekly-review',
  kind: 'meeting',
  date: '2025-06-02',
  title: 'Weekly review',
  text: 'We decided to pilot a second shift on the constrained line. Owner: head-of-ops. Dissent: cfo.',
};

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

function mockOllama(response: unknown) {
  globalThis.fetch = vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ response: JSON.stringify(response) }),
  })) as unknown as typeof fetch;
}

describe('OllamaLLMProvider', () => {
  it('is a local-location provider (nothing leaves the machine)', () => {
    const p = new OllamaLLMProvider('http://127.0.0.1:11434', 'llama3.1');
    expect(p.id).toBe('ollama');
    expect(p.location).toBe('local');
  });

  it('parses Ollama JSON into schema-valid candidate drafts', async () => {
    mockOllama({
      decisions: [
        {
          domain: 'ops',
          title: 'Pilot a second shift on the constrained line',
          decision: 'Run a partial second shift for eight weeks before committing.',
          context: 'Throughput is capping delivery dates.',
          owner_role: 'head of ops',
          dissent: ['cfo'],
          tradeoffs: ['Overtime cost'],
        },
      ],
    });
    const p = new OllamaLLMProvider('http://127.0.0.1:11434', 'llama3.1');
    const out = await p.extractCandidates(DOC);
    expect(out).toHaveLength(1);
    const c = out[0]!;
    expect(c.provider).toBe('ollama');
    expect(c.draft.owner.role).toBe('head-of-ops'); // normalized to a role slug
    expect(c.draft.owner.dissent).toContain('cfo');
    expect(c.draft.sources).toEqual([DOC.ref]);
    const asDecision = { ...c.draft, id: `${DOMAIN_PREFIX[c.draft.domain]}-001`, status: 'active' };
    expect(validateDecision(asDecision).valid).toBe(true);
  });

  it('coerces an invalid domain to a valid enum value', async () => {
    mockOllama({
      decisions: [{ domain: 'marketing', title: 'Price as value packages', decision: 'Quote fixed-scope cell packages.' }],
    });
    const p = new OllamaLLMProvider('http://127.0.0.1:11434', 'llama3.1');
    const out = await p.extractCandidates(DOC);
    expect(['hiring', 'sales', 'product', 'finance', 'ops']).toContain(out[0]!.draft.domain);
  });

  it('skips unusable drafts (no decision text) rather than inventing them', async () => {
    mockOllama({ decisions: [{ domain: 'ops', title: '', decision: '' }, { domain: 'ops' }] });
    const p = new OllamaLLMProvider('http://127.0.0.1:11434', 'llama3.1');
    const out = await p.extractCandidates(DOC);
    expect(out).toHaveLength(0);
  });

  it('falls back to the local heuristic when Ollama is unreachable', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error('connect ECONNREFUSED 127.0.0.1:11434');
    }) as unknown as typeof fetch;
    const p = new OllamaLLMProvider('http://127.0.0.1:11434', 'llama3.1');
    const out = await p.extractCandidates(DOC);
    // heuristic still finds the "We decided to…" decision so capture works offline
    expect(out.length).toBeGreaterThanOrEqual(1);
    expect(out[0]!.provider).toBe('ollama');
  });
});
