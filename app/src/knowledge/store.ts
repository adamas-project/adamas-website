import path from 'node:path';
import { promises as fs } from 'node:fs';
import { atomicWrite, readText, removeFile } from '../ledger/storage.js';
import { slugify } from '../ledger/ids.js';
import { assertKnowledge, KNOWLEDGE_ID_REGEX, type KnowledgeEntry } from './schema.js';

const FENCE = '---adamas-knowledge';

function serialize(e: KnowledgeEntry): string {
  const json = JSON.stringify(e, null, 2);
  const parts: string[] = [];
  parts.push(`${FENCE}\n${json}\n${FENCE}\n`);
  parts.push(`# ${e.title}\n`);
  parts.push(`**Type:** ${e.type} · **Added:** ${e.date}${e.author ? ` · **Author:** ${e.author}` : ''}`);
  parts.push(`\n**Source:** ${e.source}\n`);
  parts.push(`## Summary\n\n${e.summary}\n`);
  if (e.takeaways?.length) parts.push(`## Key takeaways\n\n${e.takeaways.map((t) => `- ${t}`).join('\n')}\n`);
  if (e.tags?.length) parts.push(`## Tags\n\n${e.tags.join(', ')}\n`);
  return parts.join('\n');
}

function parse(md: string): KnowledgeEntry {
  const start = md.indexOf(FENCE);
  if (start === -1) throw new Error('Not an ADAMAS knowledge file');
  const after = start + FENCE.length;
  const end = md.indexOf(FENCE, after);
  const data = JSON.parse(md.slice(after, end).trim());
  assertKnowledge(data);
  return data;
}

function nextId(ids: Iterable<string>): string {
  let max = 0;
  for (const id of ids) {
    const m = /-([0-9]+)$/.exec(id);
    if (m && m[1]) max = Math.max(max, parseInt(m[1], 10));
  }
  return `KNW-${String(max + 1).padStart(3, '0')}`;
}

export type KnowledgeInput = Omit<KnowledgeEntry, 'id' | 'date'> & { id?: string; date?: string };

/** Local-first knowledge base: one Markdown+JSON file per entry. */
export class KnowledgeStore {
  private map = new Map<string, { entry: KnowledgeEntry; fileName: string }>();
  private listeners: Array<() => void> = [];

  private constructor(private readonly dir: string) {}

  /** Subscribe to create/remove changes (e.g. to refresh derived views). */
  onChange(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }
  private emit(): void {
    for (const l of this.listeners) l();
  }

  static async open(dir: string): Promise<KnowledgeStore> {
    const store = new KnowledgeStore(dir);
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

  list(filter: { q?: string; tag?: string; type?: string } = {}): KnowledgeEntry[] {
    const q = filter.q?.toLowerCase().trim();
    return [...this.map.values()]
      .map((v) => v.entry)
      .filter((e) => (filter.tag ? (e.tags ?? []).includes(filter.tag) : true))
      .filter((e) => (filter.type ? e.type === filter.type : true))
      .filter((e) =>
        q
          ? [e.title, e.summary, ...(e.takeaways ?? []), ...(e.tags ?? [])].join(' ').toLowerCase().includes(q)
          : true,
      )
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id.localeCompare(a.id)));
  }

  allTags(): string[] {
    const set = new Set<string>();
    for (const { entry } of this.map.values()) for (const t of entry.tags ?? []) set.add(t);
    return [...set].sort();
  }

  get(id: string): KnowledgeEntry | undefined {
    return this.map.get(id)?.entry;
  }

  async create(input: KnowledgeInput): Promise<KnowledgeEntry> {
    const id = input.id ?? nextId(this.map.keys());
    if (!KNOWLEDGE_ID_REGEX.test(id)) throw new Error(`Invalid knowledge id ${id}`);
    if (this.map.has(id)) throw new Error(`Knowledge ${id} already exists`);
    const entry: KnowledgeEntry = { ...input, id, date: input.date ?? new Date().toISOString().slice(0, 10) };
    assertKnowledge(entry);
    const fileName = `${id}_${slugify(entry.title)}.md`;
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
