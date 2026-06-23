import path from 'node:path';
import { promises as fs } from 'node:fs';
import { atomicWrite, readText } from '../ledger/storage.js';

// The feedback learning loop. Every decision you confirm (or correct, or
// dismiss) is remembered as an example. On future captures, a strong match to a
// confirmed example nudges the extraction toward what you've taught it — so
// ADAMAS gets better from your own corrections, on-device, no training run.

export type ExampleLabel = 'confirmed' | 'dismissed';

export interface LearnedExample {
  terms: string[];
  domain: string;
  ownerRole?: string;
  label: ExampleLabel;
  ts: string;
}

const STOP = new Set(
  ('the a an and or but to of in on at by with from as is are was were be will would can could should we our you ' +
    'they it this that these those decided decide decision owner dissent for not no into over per via more most than')
    .split(/\s+/),
);

/** Salient lowercase terms (length ≥ 4, de-duped, stopwords removed). */
export function terms(text: string): string[] {
  const out = new Set<string>();
  for (const w of text.toLowerCase().match(/[a-z][a-z0-9+#-]{3,}/g) ?? []) {
    if (!STOP.has(w)) out.add(w);
  }
  return [...out];
}

function jaccard(a: Set<string>, b: Set<string>): { overlap: number; shared: number } {
  let shared = 0;
  for (const x of a) if (b.has(x)) shared += 1;
  const union = a.size + b.size - shared;
  return { overlap: union ? shared / union : 0, shared };
}

const MAX_EXAMPLES = 500;

export class LearningStore {
  private examples: LearnedExample[] = [];

  private constructor(private readonly filePath: string) {}

  static async open(dir: string): Promise<LearningStore> {
    const store = new LearningStore(path.join(dir, 'examples.json'));
    await fs.mkdir(dir, { recursive: true });
    try {
      const data = JSON.parse(await readText(store.filePath)) as { examples?: LearnedExample[] };
      store.examples = data.examples ?? [];
    } catch {
      store.examples = [];
    }
    return store;
  }

  get count(): number {
    return this.examples.length;
  }

  all(): LearnedExample[] {
    return [...this.examples];
  }

  /** Recent confirmed examples (newest first) — used as few-shot for the model. */
  confirmed(limit = 8): LearnedExample[] {
    return this.examples.filter((e) => e.label === 'confirmed').slice(-limit).reverse();
  }

  async record(ex: { text: string; domain: string; ownerRole?: string; label: ExampleLabel }): Promise<void> {
    const t = terms(ex.text);
    if (t.length < 2) return; // too thin to learn from
    this.examples.push({ terms: t, domain: ex.domain, ownerRole: ex.ownerRole, label: ex.label, ts: new Date().toISOString() });
    if (this.examples.length > MAX_EXAMPLES) this.examples = this.examples.slice(-MAX_EXAMPLES);
    await this.save();
  }

  /**
   * Suggest a domain/owner for new text from the closest confirmed example.
   * Conservative: requires a strong term overlap so it never guesses wildly.
   */
  suggest(text: string): { domain?: string; ownerRole?: string; confidence: number } {
    const t = new Set(terms(text));
    if (!t.size) return { confidence: 0 };
    let best: { ex: LearnedExample; overlap: number } | null = null;
    for (const ex of this.examples) {
      if (ex.label !== 'confirmed') continue;
      const { overlap, shared } = jaccard(t, new Set(ex.terms));
      if (shared >= 2 && overlap >= 0.34 && (!best || overlap > best.overlap)) best = { ex, overlap };
    }
    if (!best) return { confidence: 0 };
    return { domain: best.ex.domain, ownerRole: best.ex.ownerRole, confidence: best.overlap };
  }

  private async save(): Promise<void> {
    await atomicWrite(this.filePath, JSON.stringify({ version: 1, examples: this.examples }, null, 2));
  }
}
