import type { Candidate, CandidateDraft, LLMProvider, SourceDocument } from './provider.js';
import { runHeuristicExtraction } from './extract.js';
import { DOMAINS, type Domain } from '../schema/decision.schema.js';

// OllamaLLMProvider — Hermes backed by a local Ollama model. Ollama runs on the
// same machine (default http://127.0.0.1:11434), so this is still local-first:
// `location` is 'local' and no content leaves the device. If Ollama is
// unreachable or returns unusable output, it falls back to the deterministic
// heuristic extractor so capture never hard-fails offline.

interface OllamaDraft {
  domain?: string;
  title?: string;
  decision?: string;
  context?: string;
  owner_role?: string;
  owner_name?: string;
  dissent?: string[];
  tradeoffs?: string[];
}

const PROMPT_INTRO = [
  'You are Hermes, the evaluation agent for ADAMAS, a decision ledger.',
  'Extract the concrete BUSINESS DECISIONS from the document below.',
  'For each decision capture: the exact choice made, the situation/why (context),',
  'the owner ROLE (never a person name), any recorded dissent (roles), and trade-offs.',
  'Return STRICT JSON only, shape:',
  '{"decisions":[{"domain":"hiring|sales|product|finance|ops","title":"<=120 chars, the choice made",',
  '"decision":"the exact, falsifiable choice","context":"the why","owner_role":"a-role-not-a-name",',
  '"dissent":["role"],"tradeoffs":["..."]}]}',
  'If the document contains no decision, return {"decisions":[]}. Output JSON only, no prose.',
].join(' ');

function coerceDomain(value: string | undefined, fallbackText: string): Domain {
  const v = (value ?? '').trim().toLowerCase();
  if ((DOMAINS as readonly string[]).includes(v)) return v as Domain;
  // Reuse the heuristic's inference by extracting from text as a fallback.
  const guess = runHeuristicExtraction({ ref: 'x', kind: 'doc', date: '2000-01-01', title: '', text: fallbackText }, 'x');
  return guess[0]?.draft.domain ?? 'ops';
}

function clampTitle(s: string): string {
  const t = s.trim().replace(/[.!?]+$/, '');
  return t.length > 120 ? `${t.slice(0, 117).trimEnd()}…` : t;
}

function normalize(raw: OllamaDraft, doc: SourceDocument): CandidateDraft | null {
  const decision = (raw.decision ?? '').trim();
  const title = (raw.title ?? raw.decision ?? '').trim();
  if (!decision || !title) return null; // unusable — skip rather than invent

  const role = (raw.owner_role ?? '').trim().replace(/\s+/g, '-').toLowerCase();
  const dissent = (raw.dissent ?? [])
    .map((r) => String(r).trim().replace(/\s+/g, '-').toLowerCase())
    .filter(Boolean);
  const tradeoffs = (raw.tradeoffs ?? []).map((t) => String(t).trim()).filter(Boolean);

  const draft: CandidateDraft = {
    domain: coerceDomain(raw.domain, `${doc.text} ${title} ${decision}`),
    date: doc.date,
    title: clampTitle(title),
    context: (raw.context ?? '').trim() || doc.title || 'Captured from source; context to be confirmed.',
    decision,
    owner: { role: role || 'decision-owner', ...(dissent.length ? { dissent } : {}) },
    ...(tradeoffs.length ? { tradeoffs } : {}),
    sources: [doc.ref],
  };
  return draft;
}

export class OllamaLLMProvider implements LLMProvider {
  readonly id = 'ollama';
  readonly location = 'local' as const;

  constructor(
    private readonly url: string,
    private readonly model: string,
    private readonly timeoutMs = 60000,
  ) {}

  async extractCandidates(doc: SourceDocument): Promise<Omit<Candidate, 'candidateId'>[]> {
    try {
      const prompt = `${PROMPT_INTRO}\n\n--- DOCUMENT (${doc.ref}) ---\nTITLE: ${doc.title}\n${doc.text}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      let body: { response?: string };
      try {
        const res = await fetch(`${this.url}/api/generate`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ model: this.model, prompt, stream: false, format: 'json', options: { temperature: 0 } }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Ollama responded ${res.status}`);
        body = (await res.json()) as { response?: string };
      } finally {
        clearTimeout(timer);
      }

      const parsed = JSON.parse(body.response ?? '{}') as { decisions?: OllamaDraft[] };
      const drafts = (parsed.decisions ?? [])
        .map((d) => normalize(d, doc))
        .filter((d): d is CandidateDraft => d !== null);

      // No decisions found is a valid answer; only fall back on hard failure.
      return drafts.map((draft) => ({
        draft,
        provider: this.id,
        source: { ref: doc.ref, kind: doc.kind, date: doc.date },
        confidence: 0.7,
      }));
    } catch (err) {
      console.warn(`[hermes:ollama] ${(err as Error).message} — falling back to local heuristic for ${doc.ref}`);
      return runHeuristicExtraction(doc, this.id);
    }
  }
}
