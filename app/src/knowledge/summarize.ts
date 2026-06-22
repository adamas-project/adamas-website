import type { LLMProvider } from '../evaluation/provider.js';
import { heuristicSummarize } from '../evaluation/extract.js';

// Generic words that make useless tags — they describe nothing retrievable.
const STOPWORDS = new Set(
  ('the a an and or but if then else for to of in on at by with from as is are was were be been being this that ' +
    'these those it its their our your they we you he she him her his them about into over under more most than ' +
    'have has had will would can could should may might must not no yes do does did done how what when where which ' +
    'who whom why your you’re we’re they’re i’m there here also just like get got make made use used using one two ' +
    'three new now out up down off so very much many lot really able into per via etc ' +
    // Generic filler that kept surfacing as noise tags.
    'work works working thing things stuff list lists file files item items way ways part parts kind sort type ' +
    'good bad better best need needs want wants today people group second first next last whole entire')
    .split(/\s+/),
);

export function extractTags(text: string, max = 6): string[] {
  const freq = new Map<string, number>();
  for (const w of text.toLowerCase().match(/[a-z][a-z0-9+#.-]{3,}/g) ?? []) {
    const word = w.replace(/[.]+$/, '');
    if (STOPWORDS.has(word) || word.length < 4) continue;
    freq.set(word, (freq.get(word) ?? 0) + 1);
  }
  return [...freq.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([w]) => w);
}

export interface KnowledgeSummary {
  title?: string;
  summary: string;
  takeaways: string[];
  tags: string[];
}

const NO_CONTENT =
  'Saved the link, but there was not enough readable text on the page to summarize automatically ' +
  '(some sites — e.g. X/Twitter long-form articles or paywalled pages — only expose a link). ' +
  'Open the source, or paste the article text here to generate a summary.';

/** How much real prose (letters, not URLs/markup) we need before summarizing. */
const MIN_PROSE = 80;

/** Letters-only length of the text, with URLs removed — gauges real content. */
function proseLength(text: string): number {
  return text
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^\p{L}]+/gu, ' ')
    .trim().length;
}

/**
 * Detect a chatbot-style non-answer (e.g. "I don't have access to the link,
 * please paste the content") so we never store a refusal as a summary.
 */
function looksLikeRefusal(s: string): boolean {
  return /\b(i (?:do not|don'?t|cannot|can'?t|am unable to|am not able to) (?:have )?access|could you (?:please )?(?:copy|paste|provide|share)|paste the (?:content|article|text|link)|as an ai\b|i'?m (?:sorry|unable)|i don'?t have (?:the )?(?:ability|access))/i.test(
    s,
  );
}

/** Derive a readable title from the first strong sentence of the text. */
function deriveTitle(text: string): string {
  const first = text
    .replace(/https?:\/\/\S+/g, ' ')
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .find((s) => s.length >= 12);
  if (!first) return 'Untitled note';
  const clipped = first.length > 90 ? `${first.slice(0, 87).trimEnd()}…` : first;
  return clipped.replace(/[.!?]+$/, '');
}

/** Deterministic fallback synthesis when no LLM (or the LLM is unusable). */
function heuristicSynthesis(text: string): KnowledgeSummary {
  let raw = heuristicSummarize(text);
  if (!raw.trim()) raw = text;
  const takeaways = [
    ...new Set(
      raw
        .split('\n')
        .map((l) => l.replace(/^[\s>*•\d.-]+/, '').trim())
        .filter((l) => l.length > 0),
    ),
  ].slice(0, 6);
  const summary =
    takeaways.length > 0 ? takeaways.slice(0, 3).join(' ') : raw.trim().slice(0, 600) || text.slice(0, 600);
  return { title: deriveTitle(text), summary: summary.slice(0, 1500), takeaways, tags: extractTags(text) };
}

/**
 * Synthesize a knowledge entry: a specific title, a synthesized summary, crisp
 * takeaways, and meaningful tags — structured so the memory vault is retrievable
 * and helps future decisions, not a verbatim dump. Uses the provider's
 * structured synthesis when available, with a deterministic fallback.
 */
export async function summarizeKnowledge(provider: LLMProvider, text: string): Promise<KnowledgeSummary> {
  // Nothing meaningful to summarize (e.g. a post that's just a link). Don't hand
  // an empty page to the model — small models tend to "chat" back a refusal.
  if (proseLength(text) < MIN_PROSE) {
    return { summary: NO_CONTENT, takeaways: [], tags: extractTags(text) };
  }

  // Preferred path: a single structured synthesis call.
  if (provider.synthesizeKnowledge) {
    try {
      const s = await provider.synthesizeKnowledge(text);
      if (s.summary.trim() && !looksLikeRefusal(s.summary)) {
        const fb = heuristicSynthesis(text);
        return {
          title: s.title?.trim() || fb.title,
          summary: s.summary.trim().slice(0, 1500),
          takeaways: s.takeaways.length ? s.takeaways.slice(0, 6) : fb.takeaways,
          tags: (s.tags.length ? s.tags : fb.tags).slice(0, 8),
        };
      }
    } catch {
      /* fall through to deterministic synthesis */
    }
    return heuristicSynthesis(text);
  }

  // Fallback path: prose summarizer (if any) cleaned up, else heuristic.
  const fb = heuristicSynthesis(text);
  if (provider.summarize) {
    const raw = await provider.summarize(text, { kind: 'article' });
    if (raw.trim() && !looksLikeRefusal(raw)) {
      const takeaways = [
        ...new Set(
          raw
            .split('\n')
            .map((l) => l.replace(/^[\s>*•\d.-]+/, '').trim())
            .filter((l) => l.length > 0),
        ),
      ].slice(0, 6);
      const summary = takeaways.length ? takeaways.slice(0, 3).join(' ') : raw.trim().slice(0, 600);
      return { title: fb.title, summary: summary.slice(0, 1500), takeaways, tags: fb.tags };
    }
  }
  return fb;
}
