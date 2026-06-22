import type { LLMProvider } from '../evaluation/provider.js';
import { heuristicSummarize } from '../evaluation/extract.js';

const STOPWORDS = new Set(
  ('the a an and or but if then else for to of in on at by with from as is are was were be been being this that ' +
    'these those it its their our your they we you he she him her his them about into over under more most than ' +
    'have has had will would can could should may might must not no yes do does did done how what when where which ' +
    'who whom why your you’re we’re they’re i’m there here also just like get got make made use used using one two ' +
    'three new now out up down off so very much many lot really able into per via etc')
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

/** Summarize a resource locally into a summary + key takeaways + tags. */
export async function summarizeKnowledge(provider: LLMProvider, text: string): Promise<KnowledgeSummary> {
  // Nothing meaningful to summarize (e.g. a post that's just a link). Don't hand
  // an empty page to the model — small models tend to "chat" back a refusal.
  if (proseLength(text) < MIN_PROSE) {
    return { summary: NO_CONTENT, takeaways: [], tags: extractTags(text) };
  }

  let raw = provider.summarize ? await provider.summarize(text, { kind: 'article' }) : heuristicSummarize(text);
  // If the model chatted back instead of summarizing, fall back to the
  // deterministic extractive summary of the actual text.
  if (!raw.trim() || looksLikeRefusal(raw)) raw = heuristicSummarize(text);

  const takeaways = raw
    .split('\n')
    .map((l) => l.replace(/^[\s>*•\d.-]+/, '').trim())
    .filter((l) => l.length > 0)
    .slice(0, 6);

  const summary =
    takeaways.length > 0 ? takeaways.slice(0, 3).join(' ') : raw.trim().slice(0, 600) || text.slice(0, 600);

  return { summary: summary.slice(0, 1500), takeaways, tags: extractTags(text) };
}
