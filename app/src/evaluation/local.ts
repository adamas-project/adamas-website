import type { Candidate, CandidateDraft, LLMProvider, SourceDocument } from './provider.js';
import type { Domain } from '../schema/decision.schema.js';

// LocalLLMProvider — the default, local-first evaluation provider (Hermes).
// It stands in for an on-device LLM with a deterministic heuristic extractor so
// the pipeline is fully offline and testable. A real local model (e.g. via
// Ollama) drops in behind the same LLMProvider interface.

const DECISION_CUE =
  /\b(decided to|decided that|decide to|chose to|agreed to|will|opted to|declined to|declined|resolved to|going to|committed to)\b/i;
const TRADEOFF_CUE = /\b(but|however|trade-?off|downside|risk|gives up|forgo(es)?|at the cost of|although)\b/i;

const DOMAIN_KEYWORDS: Record<Domain, RegExp> = {
  hiring: /\b(hir(e|ing)|candidate|onboard|promot|comp|salary|recruit|role offer|trial)\b/i,
  sales: /\b(price|pricing|quote|rate|deal|contract|discount|customer|client|pipeline|ICP|win|loss)\b/i,
  product: /\b(product|roadmap|tech|platform|stack|architecture|PLC|fixture|build|feature|sunset|ADR)\b/i,
  finance: /\b(margin|cash|billing|invoice|funding|equity|capital|budget|runway|floor|cost)\b/i,
  ops: /\b(cadence|supplier|vendor|WIP|capacity|safety|compliance|process|ritual|handover|risk register|lead time)\b/i,
};

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function inferDomain(text: string, hint?: Domain): Domain {
  if (hint) return hint;
  let best: Domain = 'ops';
  let bestScore = -1;
  for (const [domain, re] of Object.entries(DOMAIN_KEYWORDS) as [Domain, RegExp][]) {
    const matches = text.match(new RegExp(re, 'gi'));
    const score = matches ? matches.length : 0;
    if (score > bestScore) {
      bestScore = score;
      best = domain;
    }
  }
  return best;
}

function inferOwnerRole(text: string, domain: Domain): { role: string; name?: string } {
  const explicit = /(?:owner|decided by|decision owner)\s*[:-]\s*([a-z][a-z0-9 /-]+)/i.exec(text);
  if (explicit && explicit[1]) {
    const role = explicit[1].trim().replace(/\s+/g, '-').toLowerCase();
    return { role };
  }
  const fallback: Record<Domain, string> = {
    hiring: 'hiring-manager',
    sales: 'head-of-sales',
    product: 'head-of-engineering',
    finance: 'cfo',
    ops: 'head-of-ops',
  };
  return { role: fallback[domain] };
}

function inferDissent(text: string): string[] {
  const m = /dissent(?:ed by)?\s*[:-]\s*([a-z][a-z0-9 ,/-]+)/i.exec(text);
  if (!m || !m[1]) return [];
  return m[1]
    .split(/[,/]/)
    .map((r) => r.trim().replace(/\s+/g, '-').toLowerCase())
    .filter(Boolean);
}

function toTitle(decisionSentence: string): string {
  let t = decisionSentence
    .replace(/^we\s+/i, '')
    .replace(/^(have\s+)?(decided to|decided that|chose to|agreed to|opted to|resolved to|committed to|will|are going to|going to)\s+/i, '')
    .trim();
  t = t.charAt(0).toUpperCase() + t.slice(1);
  t = t.replace(/[.!?]+$/, '');
  if (t.length > 120) t = t.slice(0, 117).trimEnd() + '…';
  return t || 'Recorded decision';
}

export class LocalLLMProvider implements LLMProvider {
  readonly id = 'local';
  readonly location = 'local' as const;

  async extractCandidates(doc: SourceDocument): Promise<Omit<Candidate, 'candidateId'>[]> {
    const sentences = splitSentences(doc.text);
    const domain = inferDomain(doc.text, doc.domainHint);
    const owner = inferOwnerRole(doc.text, domain);
    const dissent = inferDissent(doc.text);

    const out: Omit<Candidate, 'candidateId'>[] = [];
    sentences.forEach((sentence, i) => {
      if (!DECISION_CUE.test(sentence)) return;

      // Context = the sentences before the decision in the document (the
      // situation at the time), falling back to the document title.
      const before = sentences.slice(Math.max(0, i - 2), i).join(' ').trim();
      const context = before || doc.title || 'Captured from source; context to be confirmed.';

      const tradeoffs = sentences.filter((s) => TRADEOFF_CUE.test(s) && s !== sentence).slice(0, 4);

      const draft: CandidateDraft = {
        domain,
        date: doc.date,
        title: toTitle(sentence),
        context,
        decision: sentence,
        owner: dissent.length ? { ...owner, dissent } : owner,
        ...(tradeoffs.length ? { tradeoffs } : {}),
        sources: [doc.ref],
      };

      const confidence = Math.min(1, 0.5 + 0.1 * (tradeoffs.length + (dissent.length ? 1 : 0)) + (doc.domainHint ? 0.2 : 0));
      out.push({ draft, provider: this.id, source: { ref: doc.ref, kind: doc.kind, date: doc.date }, confidence });
    });
    return out;
  }
}
