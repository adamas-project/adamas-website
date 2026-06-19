import { promises as fs } from 'node:fs';
import path from 'node:path';
import { DOMAINS, type Domain } from '../schema/decision.schema.js';
import type { SourceDocument } from '../evaluation/provider.js';
import type { Connector, ConnectorInfo, Cursor, PullResult } from './connector.js';

// Local-folder connector. Reads notes/emails dropped into a directory and turns
// each into a SourceDocument for Hermes. Fully local (no network), read-only
// (never writes to the folder), and incremental (cursor keyed by path+mtime+size).

const ALLOWED = new Set(['.md', '.markdown', '.txt', '.text', '.eml']);

function kindFor(rel: string): SourceDocument['kind'] {
  const ext = path.extname(rel).toLowerCase();
  if (ext === '.eml') return 'email';
  if (/(meeting|standup|stand-up|review|sync|1-?1|weekly|retro)/i.test(rel)) return 'meeting';
  return 'doc';
}

/** Top-level subfolder, if it names a domain, becomes a domain hint. */
function domainHintFor(rel: string): Domain | undefined {
  const top = rel.split(path.sep)[0]?.toLowerCase();
  return top && (DOMAINS as readonly string[]).includes(top) ? (top as Domain) : undefined;
}

function parseEml(raw: string): { subject?: string; body: string } {
  const sep = ['\r\n\r\n', '\n\n']
    .map((s) => ({ s, i: raw.indexOf(s) }))
    .filter((x) => x.i >= 0)
    .sort((a, b) => a.i - b.i)[0];
  if (!sep) return { body: raw };
  const headers = raw.slice(0, sep.i);
  const body = raw.slice(sep.i + sep.s.length).trim();
  const subject = /^subject:\s*(.*)$/im.exec(headers)?.[1]?.trim();
  return { subject: subject || undefined, body: body || raw };
}

function firstHeading(text: string): string | undefined {
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    return t.replace(/^#+\s*/, '').slice(0, 120);
  }
  return undefined;
}

function toSourceDocument(rel: string, raw: string, mtime: Date): SourceDocument {
  const ext = path.extname(rel).toLowerCase();
  const kind = kindFor(rel);
  let title: string | undefined;
  let text = raw;
  if (ext === '.eml') {
    const parsed = parseEml(raw);
    title = parsed.subject;
    text = parsed.body;
  }
  title = title || firstHeading(text) || path.basename(rel, ext);
  const hint = domainHintFor(rel);
  return {
    ref: `file:${rel}`,
    kind,
    date: mtime.toISOString().slice(0, 10),
    title,
    text,
    ...(hint ? { domainHint: hint } : {}),
  };
}

export class FilesystemConnector implements Connector {
  readonly info: ConnectorInfo;

  constructor(private readonly dir: string) {
    this.info = {
      id: 'filesystem',
      label: 'Local folder',
      kind: 'filesystem',
      readOnly: true,
      network: false,
      location: dir,
      configured: true,
    };
  }

  async pull(cursor: Cursor): Promise<{ result: PullResult; cursor: Cursor }> {
    let names: string[];
    try {
      names = (await fs.readdir(this.dir, { recursive: true })) as string[];
    } catch {
      return { result: { documents: [], scanned: 0, skipped: 0 }, cursor };
    }

    const next: Cursor = { ...cursor };
    const documents: SourceDocument[] = [];
    let scanned = 0;
    let skipped = 0;

    for (const name of names.sort()) {
      const rel = String(name);
      if (rel.split(path.sep).some((p) => p.startsWith('.'))) continue; // skip hidden
      if (!ALLOWED.has(path.extname(rel).toLowerCase())) continue;
      const abs = path.join(this.dir, rel);
      let st;
      try {
        st = await fs.stat(abs);
      } catch {
        continue;
      }
      if (!st.isFile()) continue;
      scanned++;
      const sig = `${Math.round(st.mtimeMs)}:${st.size}`;
      if (cursor[rel] === sig) {
        skipped++;
        continue;
      }
      const raw = await fs.readFile(abs, 'utf8');
      documents.push(toSourceDocument(rel, raw, st.mtime));
      next[rel] = sig;
    }

    return { result: { documents, scanned, skipped }, cursor: next };
  }
}
