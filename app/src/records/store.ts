import path from 'node:path';
import { promises as fs } from 'node:fs';
import { atomicWrite, readText, removeFile } from '../ledger/storage.js';
import { slugify } from '../ledger/ids.js';
import { assertRecord, RECORD_ID_REGEX, RECORD_CATEGORY_LABEL, type RecordEntry, type RecordCategory } from './schema.js';

const FENCE = '---adamas-record';

function serialize(r: RecordEntry): string {
  const json = JSON.stringify(r, null, 2);
  const facts: string[] = [];
  if (r.owner) facts.push(`**Owner:** ${r.owner}`);
  if (r.status) facts.push(`**Status:** ${r.status}`);
  if (r.amount != null) facts.push(`**Value:** ${r.currency ?? ''}${r.amount.toLocaleString()}${r.recurring ? '/yr' : ''}`);
  if (r.metric) facts.push(`**Metric:** ${r.metric}${r.period ? ` (${r.period})` : ''}`);
  if (r.severity) facts.push(`**Severity:** ${r.severity}`);
  if (r.dueDate) facts.push(`**Due/renewal:** ${r.dueDate}`);
  const parts: string[] = [];
  parts.push(`${FENCE}\n${json}\n${FENCE}\n`);
  parts.push(`# ${r.title}\n`);
  parts.push(`_${RECORD_CATEGORY_LABEL[r.category]}_${facts.length ? ` · ${facts.join(' · ')}` : ''}\n`);
  parts.push(`${r.summary}\n`);
  if (r.mitigation) parts.push(`**Mitigation:** ${r.mitigation}\n`);
  if (r.source) parts.push(`**Source:** ${r.source}\n`);
  return parts.join('\n');
}

function parse(md: string): RecordEntry {
  const start = md.indexOf(FENCE);
  if (start === -1) throw new Error('Not an ADAMAS record file');
  const after = start + FENCE.length;
  const end = md.indexOf(FENCE, after);
  const data = JSON.parse(md.slice(after, end).trim());
  assertRecord(data);
  return data;
}

function nextId(ids: Iterable<string>): string {
  let max = 0;
  for (const id of ids) {
    const m = /-([0-9]+)$/.exec(id);
    if (m && m[1]) max = Math.max(max, parseInt(m[1], 10));
  }
  return `REC-${String(max + 1).padStart(3, '0')}`;
}

export type RecordInput = Omit<RecordEntry, 'id' | 'date'> & { id?: string; date?: string };

/** Local-first diligence records: one Markdown+JSON file per record. */
export class RecordStore {
  private map = new Map<string, { entry: RecordEntry; fileName: string }>();
  private listeners: Array<() => void> = [];

  private constructor(private readonly dir: string) {}

  onChange(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }
  private emit(): void {
    for (const l of this.listeners) l();
  }

  static async open(dir: string): Promise<RecordStore> {
    const store = new RecordStore(dir);
    await fs.mkdir(dir, { recursive: true });
    for (const f of (await fs.readdir(dir)).filter((x) => x.endsWith('.md'))) {
      try {
        const entry = parse(await readText(path.join(dir, f)));
        store.map.set(entry.id, { entry, fileName: f });
      } catch {
        /* skip unreadable */
      }
    }
    return store;
  }

  get count(): number {
    return this.map.size;
  }

  /** Distinct categories that have at least one record (for completeness). */
  categories(): RecordCategory[] {
    return [...new Set([...this.map.values()].map((v) => v.entry.category))];
  }

  list(filter: { q?: string; category?: string } = {}): RecordEntry[] {
    const q = filter.q?.toLowerCase().trim();
    return [...this.map.values()]
      .map((v) => v.entry)
      .filter((e) => (filter.category ? e.category === filter.category : true))
      .filter((e) => (q ? [e.title, e.summary, e.owner, e.status].join(' ').toLowerCase().includes(q) : true))
      .sort((a, b) => (a.category === b.category ? a.title.localeCompare(b.title) : a.category.localeCompare(b.category)));
  }

  get(id: string): RecordEntry | undefined {
    return this.map.get(id)?.entry;
  }

  async create(input: RecordInput): Promise<RecordEntry> {
    const id = input.id ?? nextId(this.map.keys());
    if (!RECORD_ID_REGEX.test(id)) throw new Error(`Invalid record id ${id}`);
    if (this.map.has(id)) throw new Error(`Record ${id} already exists`);
    const entry: RecordEntry = { ...input, id, date: input.date ?? new Date().toISOString().slice(0, 10) };
    assertRecord(entry);
    const fileName = `${id}_${entry.category}_${slugify(entry.title)}.md`;
    await atomicWrite(path.join(this.dir, fileName), serialize(entry));
    this.map.set(id, { entry, fileName });
    this.emit();
    return entry;
  }

  async remove(id: string): Promise<boolean> {
    const v = this.map.get(id);
    if (!v) return false;
    await removeFile(path.join(this.dir, v.fileName));
    this.map.delete(id);
    this.emit();
    return true;
  }
}
