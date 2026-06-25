import path from 'node:path';
import { promises as fs } from 'node:fs';
import { atomicWrite, readText, removeFile } from '../ledger/storage.js';
import { slugify } from '../ledger/ids.js';
import { assertGlossary, GLOSSARY_ID_REGEX, type GlossaryEntry } from './schema.js';

const FENCE = '---adamas-glossary';

function serialize(e: GlossaryEntry): string {
  const json = JSON.stringify(e, null, 2);
  const parts: string[] = [];
  parts.push(`${FENCE}\n${json}\n${FENCE}\n`);
  parts.push(`# ${e.term}\n`);
  if (e.aliases?.length) parts.push(`*Also: ${e.aliases.join(', ')}*\n`);
  parts.push(`${e.definition}\n`);
  if (e.tags?.length) parts.push(`Tags: ${e.tags.join(', ')}\n`);
  return parts.join('\n');
}

function parse(md: string): GlossaryEntry {
  const start = md.indexOf(FENCE);
  if (start === -1) throw new Error('Not an ADAMAS glossary file');
  const after = start + FENCE.length;
  const end = md.indexOf(FENCE, after);
  const data = JSON.parse(md.slice(after, end).trim());
  assertGlossary(data);
  return data;
}

function nextId(ids: Iterable<string>): string {
  let max = 0;
  for (const id of ids) {
    const m = /-([0-9]+)$/.exec(id);
    if (m && m[1]) max = Math.max(max, parseInt(m[1], 10));
  }
  return `GLO-${String(max + 1).padStart(3, '0')}`;
}

export type GlossaryInput = Omit<GlossaryEntry, 'id' | 'date'> & { id?: string; date?: string };

/** Local-first glossary: one Markdown+JSON file per term. */
export class GlossaryStore {
  private map = new Map<string, { entry: GlossaryEntry; fileName: string }>();
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

  static async open(dir: string): Promise<GlossaryStore> {
    const store = new GlossaryStore(dir);
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

  list(filter: { q?: string; tag?: string } = {}): GlossaryEntry[] {
    const q = filter.q?.toLowerCase().trim();
    return [...this.map.values()]
      .map((v) => v.entry)
      .filter((e) => (filter.tag ? (e.tags ?? []).includes(filter.tag) : true))
      .filter((e) =>
        q ? [e.term, e.definition, ...(e.aliases ?? []), ...(e.tags ?? [])].join(' ').toLowerCase().includes(q) : true,
      )
      .sort((a, b) => a.term.localeCompare(b.term));
  }

  allTags(): string[] {
    const set = new Set<string>();
    for (const { entry } of this.map.values()) for (const tg of entry.tags ?? []) set.add(tg);
    return [...set].sort();
  }

  get(id: string): GlossaryEntry | undefined {
    return this.map.get(id)?.entry;
  }

  async create(input: GlossaryInput): Promise<GlossaryEntry> {
    const id = input.id ?? nextId(this.map.keys());
    if (!GLOSSARY_ID_REGEX.test(id)) throw new Error(`Invalid glossary id ${id}`);
    if (this.map.has(id)) throw new Error(`Glossary ${id} already exists`);
    const entry: GlossaryEntry = { ...input, id, date: input.date ?? new Date().toISOString().slice(0, 10) };
    assertGlossary(entry);
    const fileName = `${id}_${slugify(entry.term)}.md`;
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
