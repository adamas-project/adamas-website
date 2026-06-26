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

function idNum(id: string): number {
  const m = /-([0-9]+)$/.exec(id);
  return m && m[1] ? parseInt(m[1], 10) : 0;
}

const KIND_RANK: Record<PersonEntry['kind'], number> = { founder: 5, board: 4, advisor: 3, employee: 2, contractor: 1 };

function union(...lists: (string[] | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of lists) for (const v of list ?? []) {
    const k = v.trim();
    if (k && !seen.has(k.toLowerCase())) { seen.add(k.toLowerCase()); out.push(k); }
  }
  return out;
}

/**
 * Merge several records for the same person into one, keeping the canonical id
 * (passed first) and combining every field: the richest summary, the strongest
 * `kind` (founder > board > advisor > employee > contractor), unioned skills /
 * highlights / links, OR-ed key-person flag, and the earliest date. Pure +
 * unit-tested so the merge behaviour is verifiable without the filesystem.
 */
export function mergePeopleEntries(entries: PersonEntry[]): PersonEntry {
  const base = entries[0]!;
  const out: PersonEntry = { id: base.id, name: base.name, role: base.role, kind: base.kind, date: base.date, summary: base.summary };
  for (const e of entries) {
    if (e.summary.length > out.summary.length) out.summary = e.summary;
    if (!out.role && e.role) out.role = e.role;
    if (KIND_RANK[e.kind] > KIND_RANK[out.kind]) out.kind = e.kind;
    if (e.date < out.date) out.date = e.date;
    out.keyPerson = out.keyPerson || e.keyPerson || undefined;
    out.startDate = out.startDate || e.startDate;
    out.location = out.location || e.location;
    out.email = out.email || e.email;
    if ((e.excerpt?.length ?? 0) > (out.excerpt?.length ?? 0)) out.excerpt = e.excerpt;
  }
  const skills = union(...entries.map((e) => e.skills));
  const highlights = union(...entries.map((e) => e.highlights));
  const links = union(...entries.map((e) => e.links));
  if (skills.length) out.skills = skills;
  if (highlights.length) out.highlights = highlights;
  if (links.length) out.links = links;
  if (!out.keyPerson) delete out.keyPerson;
  return out;
}

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

  /** How many records would be removed by merging same-name duplicates. */
  duplicateCount(): number {
    const byName = new Map<string, number>();
    for (const { entry } of this.map.values()) {
      const k = entry.name.trim().toLowerCase();
      byName.set(k, (byName.get(k) ?? 0) + 1);
    }
    let extra = 0;
    for (const n of byName.values()) if (n > 1) extra += n - 1;
    return extra;
  }

  /**
   * Merge people that share the same name (case-insensitive) into a single
   * record, keeping the lowest-numbered id as canonical and combining all fields.
   * Idempotent: a second call with no duplicates is a no-op.
   */
  async mergeDuplicates(): Promise<{ merged: number; names: string[] }> {
    const groups = new Map<string, { entry: PersonEntry; fileName: string }[]>();
    for (const v of this.map.values()) {
      const k = v.entry.name.trim().toLowerCase();
      const g = groups.get(k);
      if (g) g.push(v);
      else groups.set(k, [v]);
    }

    let merged = 0;
    const names: string[] = [];
    for (const group of groups.values()) {
      if (group.length < 2) continue;
      group.sort((a, b) => idNum(a.entry.id) - idNum(b.entry.id));
      const survivor = group[0]!;
      const mergedEntry = mergePeopleEntries(group.map((g) => g.entry));
      mergedEntry.id = survivor.entry.id; // keep the canonical id + file
      assertPerson(mergedEntry);
      await atomicWrite(path.join(this.dir, survivor.fileName), serialize(mergedEntry));
      this.map.set(survivor.entry.id, { entry: mergedEntry, fileName: survivor.fileName });
      for (const dup of group.slice(1)) {
        await removeFile(path.join(this.dir, dup.fileName));
        this.map.delete(dup.entry.id);
        merged++;
      }
      names.push(mergedEntry.name);
    }
    if (merged > 0) this.emit();
    return { merged, names };
  }
}
