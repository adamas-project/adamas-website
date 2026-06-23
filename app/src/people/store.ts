import path from 'node:path';
import { promises as fs } from 'node:fs';
import { atomicWrite, readText, removeFile } from '../ledger/storage.js';
import { slugify } from '../ledger/ids.js';
import { assertPerson, PERSON_ID_REGEX, type PersonEntry } from './schema.js';

const FENCE = '---adamas-person';

function serialize(p: PersonEntry): string {
  const json = JSON.stringify(p, null, 2);
  const parts: string[] = [];
  parts.push(`${FENCE}\n${json}\n${FENCE}\n`);
  parts.push(`# ${p.name}\n`);
  parts.push(`**Role:** ${p.role} · **Type:** ${p.kind}${p.keyPerson ? ' · **Key person**' : ''}`);
  if (p.startDate || p.location) parts.push(`\n${[p.startDate ? `Since ${p.startDate}` : '', p.location ?? ''].filter(Boolean).join(' · ')}`);
  parts.push(`\n## Bio\n\n${p.summary}\n`);
  if (p.highlights?.length) parts.push(`## Highlights\n\n${p.highlights.map((t) => `- ${t}`).join('\n')}\n`);
  if (p.skills?.length) parts.push(`## Skills\n\n${p.skills.join(', ')}\n`);
  return parts.join('\n');
}

function parse(md: string): PersonEntry {
  const start = md.indexOf(FENCE);
  if (start === -1) throw new Error('Not an ADAMAS person file');
  const after = start + FENCE.length;
  const end = md.indexOf(FENCE, after);
  const data = JSON.parse(md.slice(after, end).trim());
  assertPerson(data);
  return data;
}

function nextId(ids: Iterable<string>): string {
  let max = 0;
  for (const id of ids) {
    const m = /-([0-9]+)$/.exec(id);
    if (m && m[1]) max = Math.max(max, parseInt(m[1], 10));
  }
  return `PER-${String(max + 1).padStart(3, '0')}`;
}

export type PersonInput = Omit<PersonEntry, 'id' | 'date'> & { id?: string; date?: string };

/** Local-first people registry: one Markdown+JSON file per team member. */
export class PeopleStore {
  private map = new Map<string, { entry: PersonEntry; fileName: string }>();
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

  static async open(dir: string): Promise<PeopleStore> {
    const store = new PeopleStore(dir);
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

  list(filter: { q?: string; kind?: string } = {}): PersonEntry[] {
    const q = filter.q?.toLowerCase().trim();
    return [...this.map.values()]
      .map((v) => v.entry)
      .filter((e) => (filter.kind ? e.kind === filter.kind : true))
      .filter((e) =>
        q ? [e.name, e.role, e.summary, ...(e.skills ?? [])].join(' ').toLowerCase().includes(q) : true,
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  get(id: string): PersonEntry | undefined {
    return this.map.get(id)?.entry;
  }

  async create(input: PersonInput): Promise<PersonEntry> {
    const id = input.id ?? nextId(this.map.keys());
    if (!PERSON_ID_REGEX.test(id)) throw new Error(`Invalid person id ${id}`);
    if (this.map.has(id)) throw new Error(`Person ${id} already exists`);
    const entry: PersonEntry = { ...input, id, date: input.date ?? new Date().toISOString().slice(0, 10) };
    assertPerson(entry);
    const fileName = `${id}_${slugify(entry.name)}.md`;
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
