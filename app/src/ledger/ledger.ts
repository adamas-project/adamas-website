import path from 'node:path';
import {
  PREFIX_DOMAIN,
  type Decision,
  type Domain,
  type Status,
} from '../schema/decision.schema.js';
import { assertDecision } from '../schema/validate.js';
import { LedgerIndex } from './index-store.js';
import { serializeDecision } from './markdown.js';
import { fileName as buildFileName, isValidId, nextId, prefixOf } from './ids.js';
import {
  atomicWrite,
  ensureVault,
  removeFile,
  vaultPaths,
  type VaultPaths,
} from './storage.js';

export class LedgerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LedgerError';
  }
}

export type ChangeType = 'created' | 'updated' | 'status-changed';
export interface ChangeEvent {
  type: ChangeType;
  id: string;
  /** Ids whose stored record changed as a side effect (e.g. reverse links). */
  affected: string[];
}
export type ChangeListener = (event: ChangeEvent) => void;

/** Input to create a decision. `id` is optional (auto-generated from domain). */
export type DecisionInput = Omit<Decision, 'id' | 'status'> & {
  id?: string;
  status?: Status;
};

export interface LedgerFilter {
  domain?: Domain;
  status?: Status;
}

export class Ledger {
  readonly paths: VaultPaths;
  private readonly index: LedgerIndex;
  private listeners: ChangeListener[] = [];

  private constructor(root: string) {
    this.paths = vaultPaths(root);
    this.index = new LedgerIndex(this.paths);
  }

  static async open(root: string): Promise<Ledger> {
    const ledger = new Ledger(root);
    await ensureVault(ledger.paths);
    await ledger.index.rebuild();
    return ledger;
  }

  // --- change notification (drives asset staleness) ---
  onChange(listener: ChangeListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }
  private emit(event: ChangeEvent): void {
    for (const l of this.listeners) l(event);
  }

  // --- reads ---
  get version(): number {
    return this.index.ledgerVersion;
  }
  get count(): number {
    return this.index.count;
  }
  has(id: string): boolean {
    return this.index.has(id);
  }
  get(id: string): Decision | undefined {
    return clone(this.index.getDecision(id));
  }
  getOrThrow(id: string): Decision {
    const d = this.get(id);
    if (!d) throw new LedgerError(`No decision with id ${id}`);
    return d;
  }
  list(filter: LedgerFilter = {}): Decision[] {
    return this.index
      .all()
      .filter((d) => (filter.domain ? d.domain === filter.domain : true))
      .filter((d) => (filter.status ? (d.status ?? 'active') === filter.status : true))
      .map((d) => clone(d)!)
      .sort((a, b) => a.id.localeCompare(b.id));
  }
  fileNameOf(id: string): string | undefined {
    return this.index.get(id)?.fileName;
  }

  // --- internal write of a single decision file + index ---
  private async writeDecision(decision: Decision, previousFileName?: string): Promise<void> {
    assertDecision(decision);
    const newFileName = buildFileName(decision.id, decision.title);
    if (previousFileName && previousFileName !== newFileName) {
      await removeFile(path.join(this.paths.decisions, previousFileName));
    }
    await atomicWrite(path.join(this.paths.decisions, newFileName), serializeDecision(decision));
    this.index.set(decision);
  }

  private assertPrefixMatchesDomain(id: string, domain: Domain): void {
    const expected = PREFIX_DOMAIN[prefixOf(id)];
    if (expected !== domain) {
      throw new LedgerError(
        `Id ${id} prefix does not match domain "${domain}" (expected prefix for domain).`,
      );
    }
  }

  // --- create ---
  async create(input: DecisionInput): Promise<Decision> {
    const id = input.id ?? nextId(input.domain, this.index.ids());
    if (!isValidId(id)) throw new LedgerError(`Invalid id: ${id}`);
    if (this.index.has(id)) throw new LedgerError(`Decision ${id} already exists (never overwrite).`);
    this.assertPrefixMatchesDomain(id, input.domain);

    const decision: Decision = {
      ...input,
      id,
      status: input.status ?? 'active',
    };
    // Normalize own links: dedupe, drop self-links.
    const ownLinks = unique((decision.links ?? []).filter((l) => l !== id));
    decision.links = ownLinks;
    assertDecision(decision);

    // Validate link targets exist, then add reverse links atomically.
    const affected = await this.reconcileLinks(id, [], ownLinks);
    await this.writeDecision(decision);

    this.index.bumpVersion();
    await this.index.persist();
    this.emit({ type: 'created', id, affected });
    return this.getOrThrow(id);
  }

  // --- update (never changes id; never deletes) ---
  async update(
    id: string,
    patch: Partial<Omit<Decision, 'id'>>,
  ): Promise<Decision> {
    const current = this.index.get(id);
    if (!current) throw new LedgerError(`No decision with id ${id}`);
    const prev = current.decision;

    if ('domain' in patch && patch.domain && patch.domain !== prev.domain) {
      throw new LedgerError('Domain is immutable (it is encoded in the id).');
    }

    const nextLinks =
      patch.links !== undefined
        ? unique(patch.links.filter((l) => l !== id))
        : prev.links ?? [];

    const updated: Decision = {
      ...prev,
      ...patch,
      id,
      domain: prev.domain,
      links: nextLinks,
    };
    assertDecision(updated);

    const affected = await this.reconcileLinks(id, prev.links ?? [], nextLinks);
    await this.writeDecision(updated, current.fileName);

    this.index.bumpVersion();
    await this.index.persist();
    this.emit({ type: 'updated', id, affected });
    return this.getOrThrow(id);
  }

  /**
   * Make A's link set symmetric: every newly-added target gains A; every removed
   * target loses A (principle #4). Returns the ids of counterparties touched.
   */
  private async reconcileLinks(
    id: string,
    oldLinks: string[],
    newLinks: string[],
  ): Promise<string[]> {
    const added = newLinks.filter((l) => !oldLinks.includes(l));
    const removed = oldLinks.filter((l) => !newLinks.includes(l));

    for (const target of added) {
      if (!this.index.has(target)) {
        throw new LedgerError(`Cannot link ${id} -> ${target}: target does not exist.`);
      }
    }

    const touched: string[] = [];
    for (const target of [...added, ...removed]) {
      const entry = this.index.get(target);
      if (!entry) continue; // removed target may already be gone (it never is, but be safe)
      const t = entry.decision;
      const links = new Set(t.links ?? []);
      if (added.includes(target)) links.add(id);
      if (removed.includes(target)) links.delete(id);
      const nextT: Decision = { ...t, links: [...links].sort() };
      await this.writeDecision(nextT, entry.fileName);
      touched.push(target);
    }
    return touched;
  }

  // --- status transitions (never delete) ---
  async setStatus(
    id: string,
    status: Status,
    superseded_by?: string,
  ): Promise<Decision> {
    const current = this.getOrThrow(id);

    if (status === 'active') {
      const updated = await this.update(id, { status: 'active', superseded_by: undefined });
      this.emit({ type: 'status-changed', id, affected: [] });
      return updated;
    }

    // superseded/reversed require a successor that exists and is not self.
    if (!superseded_by) {
      throw new LedgerError(`Status "${status}" requires a superseded_by successor id.`);
    }
    if (superseded_by === id) throw new LedgerError('A decision cannot supersede itself.');
    if (!this.index.has(superseded_by)) {
      throw new LedgerError(`Successor ${superseded_by} does not exist.`);
    }

    // Link the two decisions bidirectionally and set status. The original is
    // kept forever (principle #1) — only its status and pointer change.
    const links = unique([...(current.links ?? []), superseded_by]);
    await this.update(id, { status, superseded_by, links });
    this.emit({ type: 'status-changed', id, affected: [superseded_by] });
    return this.getOrThrow(id);
  }

  async supersede(id: string, successor: string | DecisionInput): Promise<{ original: Decision; successor: Decision }> {
    return this.transitionWithSuccessor(id, successor, 'superseded');
  }
  async reverse(id: string, successor: string | DecisionInput): Promise<{ original: Decision; successor: Decision }> {
    return this.transitionWithSuccessor(id, successor, 'reversed');
  }

  private async transitionWithSuccessor(
    id: string,
    successor: string | DecisionInput,
    status: Extract<Status, 'superseded' | 'reversed'>,
  ): Promise<{ original: Decision; successor: Decision }> {
    this.getOrThrow(id);
    let successorId: string;
    if (typeof successor === 'string') {
      successorId = successor;
      if (!this.index.has(successorId)) throw new LedgerError(`Successor ${successorId} does not exist.`);
    } else {
      const created = await this.create(successor);
      successorId = created.id;
    }
    await this.setStatus(id, status, successorId);
    return { original: this.getOrThrow(id), successor: this.getOrThrow(successorId) };
  }

  /** Rebuild the derived index from the canonical Markdown files. */
  async rebuildIndex(): Promise<void> {
    await this.index.rebuild();
    await this.index.persist();
  }

  /** Verify link symmetry across the whole ledger (integrity check). */
  linkSymmetryViolations(): Array<{ from: string; to: string }> {
    const violations: Array<{ from: string; to: string }> = [];
    for (const d of this.index.all()) {
      for (const target of d.links ?? []) {
        const t = this.index.getDecision(target);
        if (!t || !(t.links ?? []).includes(d.id)) {
          violations.push({ from: d.id, to: target });
        }
      }
    }
    return violations;
  }
}

function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

function clone<T>(value: T | undefined): T | undefined {
  return value === undefined ? undefined : structuredClone(value);
}
