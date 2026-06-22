import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { FilesystemConnector } from '../src/ingestion/filesystem.js';
import { ConnectorManager } from '../src/ingestion/manager.js';
import { ConnectorScheduler } from '../src/ingestion/scheduler.js';
import { Ledger } from '../src/ledger/ledger.js';
import { CaptureInbox } from '../src/evaluation/inbox.js';
import { LocalLLMProvider } from '../src/evaluation/local.js';
import { tempVault } from './helpers.js';

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
});

function tempDir(): string {
  const d = mkdtempSync(path.join(tmpdir(), 'adamas-src-'));
  cleanups.push(() => rmSync(d, { recursive: true, force: true }));
  return d;
}

async function write(dir: string, rel: string, text: string) {
  const abs = path.join(dir, rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, text);
}

describe('filesystem connector — read-only, incremental ingestion', () => {
  it('turns folder files into source documents', async () => {
    const dir = tempDir();
    await write(dir, 'q3-review.md', '# Q3 review\nWe decided to drop the hourly rate card. Owner: head of sales.');
    await write(dir, 'note.eml', 'Subject: Reseller deal\nFrom: x@y.com\n\nWe decided to decline the reseller channel. Owner: head of sales.');

    const conn = new FilesystemConnector(dir);
    const { result } = await conn.pull({});
    expect(result.documents).toHaveLength(2);
    expect(result.scanned).toBe(2);
    const byRef = Object.fromEntries(result.documents.map((d) => [d.ref, d]));
    expect(byRef['file:q3-review.md']!.kind).toBe('meeting'); // "review" in name
    expect(byRef['file:note.eml']!.kind).toBe('email');
    expect(byRef['file:note.eml']!.title).toBe('Reseller deal'); // from Subject
    expect(byRef['file:note.eml']!.text).not.toMatch(/Subject:/); // headers stripped
  });

  it('is incremental: unchanged files are skipped on the next pull', async () => {
    const dir = tempDir();
    await write(dir, 'a.md', 'We decided to ship weekly. Owner: head of ops.');
    const conn = new FilesystemConnector(dir);
    const first = await conn.pull({});
    expect(first.result.documents).toHaveLength(1);

    const second = await conn.pull(first.cursor);
    expect(second.result.documents).toHaveLength(0);
    expect(second.result.skipped).toBe(1);
  });

  it('re-pulls a file after it changes', async () => {
    const dir = tempDir();
    await write(dir, 'a.md', 'We decided to ship weekly. Owner: head of ops.');
    const conn = new FilesystemConnector(dir);
    const first = await conn.pull({});
    await new Promise((r) => setTimeout(r, 10));
    await write(dir, 'a.md', 'We decided to ship daily instead. Owner: head of ops.');
    const second = await conn.pull(first.cursor);
    expect(second.result.documents).toHaveLength(1);
    expect(second.result.documents[0]!.text).toMatch(/daily/);
  });

  it('never modifies the source folder (read-only)', async () => {
    const dir = tempDir();
    await write(dir, 'a.md', 'We decided X. Owner: cfo.');
    const before = await fs.readFile(path.join(dir, 'a.md'), 'utf8');
    const beforeList = (await fs.readdir(dir)).sort();
    await new FilesystemConnector(dir).pull({});
    expect(await fs.readFile(path.join(dir, 'a.md'), 'utf8')).toBe(before);
    expect((await fs.readdir(dir)).sort()).toEqual(beforeList);
  });

  it('uses a domain subfolder as a domain hint', async () => {
    const dir = tempDir();
    await write(dir, 'finance/budget.md', 'We decided to hold a 20% margin floor. Owner: cfo.');
    const { result } = await new FilesystemConnector(dir).pull({});
    expect(result.documents[0]!.domainHint).toBe('finance');
  });
});

describe('connector manager + inbox gate', () => {
  it('persists the cursor across restarts', async () => {
    const dir = tempDir();
    await write(dir, 'a.md', 'We decided Y. Owner: head of ops.');
    const v = tempVault();
    cleanups.push(v.cleanup);
    const cursorPath = path.join(v.root, 'connectors.json');

    const m1 = await ConnectorManager.open(cursorPath, [new FilesystemConnector(dir)]);
    expect((await m1.pull('filesystem')).documents).toHaveLength(1);

    const m2 = await ConnectorManager.open(cursorPath, [new FilesystemConnector(dir)]);
    expect((await m2.pull('filesystem')).documents).toHaveLength(0); // cursor remembered
  });

  it('pulled material lands in the inbox, not the ledger', async () => {
    const dir = tempDir();
    await write(dir, 'a.md', 'We decided to cap concurrent builds at three. Owner: head of ops.');
    const v = tempVault();
    cleanups.push(v.cleanup);
    const ledger = await Ledger.open(v.root);
    const inbox = await CaptureInbox.open(path.join(v.root, 'candidates.json'), ledger);
    const manager = await ConnectorManager.open(path.join(v.root, 'connectors.json'), [new FilesystemConnector(dir)]);

    const { documents } = await manager.pull('filesystem');
    const added = await inbox.ingest(new LocalLLMProvider(), documents);

    expect(added.length).toBeGreaterThan(0);
    expect(inbox.pendingCount).toBe(added.length);
    expect(ledger.count).toBe(0); // nothing enters the ledger unreviewed
  });
});

describe('connector scheduler — auto-pull into the inbox', () => {
  it('runOnce pulls all connectors and ingests new documents', async () => {
    const dir = tempDir();
    await write(dir, 'a.md', 'We decided to cap concurrent builds at three. Owner: head of ops.');
    const v = tempVault();
    cleanups.push(v.cleanup);
    const ledger = await Ledger.open(v.root);
    const inbox = await CaptureInbox.open(path.join(v.root, 'candidates.json'), ledger);
    const manager = await ConnectorManager.open(path.join(v.root, 'connectors.json'), [new FilesystemConnector(dir)]);

    const scheduler = new ConnectorScheduler(manager, inbox, new LocalLLMProvider(), 0);
    const first = await scheduler.runOnce();
    expect(first.pulled).toBeGreaterThan(0);
    expect(first.added).toBeGreaterThan(0);
    expect(ledger.count).toBe(0); // still gated through the inbox

    // Incremental: a second cycle finds nothing new.
    const second = await scheduler.runOnce();
    expect(second.pulled).toBe(0);
  });
});
