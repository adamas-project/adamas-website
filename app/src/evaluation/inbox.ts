import { createHash } from 'node:crypto';
import type { Ledger } from '../ledger/ledger.js';
import type { Decision } from '../schema/decision.schema.js';
import { atomicWrite, readText } from '../ledger/storage.js';
import type { Candidate, CandidateDraft, LLMProvider, SourceDocument } from './provider.js';

export type CandidateStatus = 'pending' | 'confirmed' | 'dismissed';

export interface StoredCandidate extends Candidate {
  status: CandidateStatus;
  createdId?: string; // ledger id once confirmed
  decidedAt?: string;
}

function candidateIdFor(c: Omit<Candidate, 'candidateId'>): string {
  const h = createHash('sha1')
    .update(`${c.provider}|${c.source.ref}|${c.draft.title}|${c.draft.decision}`)
    .digest('hex')
    .slice(0, 10);
  return `cand-${h}`;
}

/**
 * The Capture Inbox holds candidate decisions surfaced by Hermes. NOTHING here
 * is in the ledger. A candidate becomes a real decision only via `confirm()`;
 * `dismiss()` archives it. This is the single gate between evaluation and the
 * ledger.
 */
export class CaptureInbox {
  private candidates = new Map<string, StoredCandidate>();

  private constructor(
    private readonly filePath: string,
    private readonly ledger: Ledger,
  ) {}

  static async open(filePath: string, ledger: Ledger): Promise<CaptureInbox> {
    const inbox = new CaptureInbox(filePath, ledger);
    await inbox.load();
    return inbox;
  }

  private async load(): Promise<void> {
    try {
      const raw = await readText(this.filePath);
      const data = JSON.parse(raw) as { candidates?: StoredCandidate[] };
      this.candidates.clear();
      for (const c of data.candidates ?? []) this.candidates.set(c.candidateId, c);
    } catch {
      this.candidates.clear();
    }
  }

  private async save(): Promise<void> {
    await atomicWrite(
      this.filePath,
      JSON.stringify({ version: 1, candidates: [...this.candidates.values()] }, null, 2),
    );
  }

  /** Run a provider over source documents and add new pending candidates. */
  async ingest(provider: LLMProvider, docs: SourceDocument[]): Promise<StoredCandidate[]> {
    const added: StoredCandidate[] = [];
    for (const doc of docs) {
      const extracted = await provider.extractCandidates(doc);
      for (const c of extracted) {
        const candidateId = candidateIdFor(c);
        if (this.candidates.has(candidateId)) continue; // idempotent
        const stored: StoredCandidate = { ...c, candidateId, status: 'pending' };
        this.candidates.set(candidateId, stored);
        added.push(stored);
      }
    }
    await this.save();
    return added;
  }

  list(status: CandidateStatus = 'pending'): StoredCandidate[] {
    return [...this.candidates.values()]
      .filter((c) => c.status === status)
      .sort((a, b) => b.confidence - a.confidence);
  }

  all(): StoredCandidate[] {
    return [...this.candidates.values()];
  }

  get(id: string): StoredCandidate | undefined {
    return this.candidates.get(id);
  }

  get pendingCount(): number {
    return this.list('pending').length;
  }

  /** Archive a candidate without it ever touching the ledger. */
  async dismiss(id: string): Promise<StoredCandidate> {
    const c = this.candidates.get(id);
    if (!c) throw new Error(`No candidate ${id}`);
    if (c.status === 'confirmed') throw new Error(`Candidate ${id} already confirmed into ${c.createdId}`);
    c.status = 'dismissed';
    c.decidedAt = new Date().toISOString();
    await this.save();
    return c;
  }

  /**
   * Confirm a candidate into the ledger. Optional `overrides` let the reviewer
   * edit the draft before it is written. The draft is validated by the ledger on
   * write; an invalid draft throws and nothing is created.
   */
  async confirm(id: string, overrides: Partial<CandidateDraft> = {}): Promise<Decision> {
    const c = this.candidates.get(id);
    if (!c) throw new Error(`No candidate ${id}`);
    if (c.status === 'confirmed') throw new Error(`Candidate ${id} already confirmed into ${c.createdId}`);

    const draft: CandidateDraft = { ...c.draft, ...overrides };
    const created = await this.ledger.create({
      domain: draft.domain,
      date: draft.date,
      title: draft.title,
      context: draft.context,
      decision: draft.decision,
      owner: draft.owner,
      ...(draft.tradeoffs ? { tradeoffs: draft.tradeoffs } : {}),
      sources: draft.sources,
    });

    c.status = 'confirmed';
    c.createdId = created.id;
    c.decidedAt = new Date().toISOString();
    await this.save();
    return created;
  }
}
