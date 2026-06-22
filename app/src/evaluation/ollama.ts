import type { Candidate, CandidateDraft, LLMProvider, SourceDocument } from './provider.js';
import { runHeuristicExtraction, cleanRoleList, domainFromRole, heuristicSummarize } from './extract.js';
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
  'Read the document and extract the concrete BUSINESS DECISIONS that were made.',
  'Return STRICT JSON only — no prose, no markdown — in exactly this shape:',
  '{"decisions":[{"domain":"...","title":"...","decision":"...","context":"...","owner_role":"...","dissent":["..."],"tradeoffs":["..."]}]}',
  'Rules:',
  '- domain MUST be exactly one of: hiring, sales, product, finance, ops. Choose by what the decision is about, matching the owner\'s function: head of ops/operations -> ops; cfo/finance -> finance; head of sales/revenue -> sales; head of engineering/product/delivery -> product; hiring/people/recruiting -> hiring.',
  '- title: <=120 chars, the choice made, with no leading "We decided to".',
  '- decision: the exact, falsifiable choice.',
  '- context: the situation / why.',
  '- owner_role: a ROLE, never a person name (e.g. "head-of-ops").',
  '- dissent: an array of ROLE names ONLY, e.g. ["cfo"]. Never include explanations, sentences, or "who ..." clauses. If none, use [].',
  '- tradeoffs: short phrases. If none, use [].',
  'Example input: "Quality slipped when we ran five builds at once. We decided to cap work-in-progress at three concurrent builds. Owner: head of ops. Dissent: head of sales, who wants more throughput."',
  'Example output: {"decisions":[{"domain":"ops","title":"Cap work-in-progress at three concurrent builds","decision":"Cap concurrent builds at three; a fourth waits in a queue.","context":"Quality slipped when running five builds at once.","owner_role":"head-of-ops","dissent":["head-of-sales"],"tradeoffs":["lower throughput"]}]}',
  'If the document contains no decision, return {"decisions":[]}.',
].join('\n');

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
  const dissent = cleanRoleList(raw.dissent ?? []);
  const tradeoffs = (raw.tradeoffs ?? []).map((t) => String(t).trim()).filter(Boolean);

  const draft: CandidateDraft = {
    // File by the owner's function first (reliable), then a hint, then the model.
    domain: doc.domainHint ?? domainFromRole(role) ?? coerceDomain(raw.domain, `${doc.text} ${title} ${decision}`),
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

  async summarize(text: string, opts?: { kind?: 'meeting' | 'article' }): Promise<string> {
    const prompt =
      opts?.kind === 'article'
        ? 'Summarize this article/post for a personal knowledge base. Give the key takeaways as short bullet ' +
          'points — faithful to the source, no added opinions, no preamble.\n\n--- CONTENT ---\n' + text
        : 'Summarize this meeting transcript into the concrete DECISIONS and OUTCOMES only, ' +
          'as short bullet points. For each, note the choice made, who owned it (a role), and any trade-off. ' +
          'Plain text bullets, no preamble.\n\n--- TRANSCRIPT ---\n' +
          text;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const res = await fetch(`${this.url}/api/generate`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ model: this.model, prompt, stream: false, options: { temperature: 0.2 } }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Ollama responded ${res.status}`);
        const body = (await res.json()) as { response?: string };
        const summary = (body.response ?? '').trim();
        return summary || heuristicSummarize(text);
      } finally {
        clearTimeout(timer);
      }
    } catch (err) {
      console.warn(`[hermes:ollama] summarize failed (${(err as Error).message}) — using local summary`);
      return heuristicSummarize(text);
    }
  }
}
