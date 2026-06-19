import { describe, it, expect, afterEach } from 'vitest';
import path from 'node:path';
import { Ledger } from '../src/ledger/ledger.js';
import { CaptureInbox } from '../src/evaluation/inbox.js';
import { LocalLLMProvider } from '../src/evaluation/local.js';
import { CloudLLMProvider } from '../src/evaluation/cloud.js';
import { BoundaryService } from '../src/boundary/boundary.js';
import { SAMPLE_SOURCES } from '../src/evaluation/fixtures.js';
import { tempVault } from './helpers.js';

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
});

async function setup() {
  const { root, cleanup } = tempVault();
  cleanups.push(cleanup);
  const ledger = await Ledger.open(root);
  const inbox = await CaptureInbox.open(path.join(root, 'candidates.json'), ledger);
  const local = new LocalLLMProvider();
  const cloud = new CloudLLMProvider();
  const boundary = await BoundaryService.open(path.join(root, 'boundary-log.json'), inbox, local, cloud);
  return { root, ledger, inbox, local, cloud, boundary };
}

describe('hard data boundary — nothing transmits without approval', () => {
  it('the cloud provider refuses to run without per-task authorization', async () => {
    const { cloud } = await setup();
    await expect(cloud.extractCandidates(SAMPLE_SOURCES[0]!)).rejects.toThrow();
    expect(cloud.transmissions).toBe(0);
  });

  it('prepare shows exactly what would be transmitted and transmits nothing', async () => {
    const { boundary, cloud } = await setup();
    const preview = boundary.prepare('Evaluate with cloud', SAMPLE_SOURCES);
    expect(cloud.transmissions).toBe(0);
    expect(preview.exactContent).toHaveLength(SAMPLE_SOURCES.length);
    expect(preview.totalChars).toBeGreaterThan(0);
    // the exact source text is present in the preview
    expect(preview.exactContent.join('\n')).toContain(SAMPLE_SOURCES[0]!.text);
  });

  it('declining runs locally — no transmission — and logs the local route', async () => {
    const { boundary, cloud, inbox } = await setup();
    const preview = boundary.prepare('Evaluate', SAMPLE_SOURCES);
    const result = await boundary.decline(preview.taskId);
    expect(cloud.transmissions).toBe(0);
    expect(result.route).toBe('local');
    expect(result.added.length).toBeGreaterThan(0);
    expect(inbox.pendingCount).toBe(result.added.length);
    const log = boundary.getLog();
    expect(log.at(-1)).toMatchObject({ route: 'local', approved: false, transmittedChars: 0 });
  });

  it('approving runs the cloud route, transmits, and logs the cloud route', async () => {
    const { boundary, cloud } = await setup();
    const preview = boundary.prepare('Evaluate', SAMPLE_SOURCES);
    const result = await boundary.approve(preview.taskId);
    expect(result.route).toBe('cloud');
    expect(cloud.transmissions).toBe(SAMPLE_SOURCES.length);
    const entry = boundary.getLog().at(-1)!;
    expect(entry.route).toBe('cloud');
    expect(entry.approved).toBe(true);
    expect(entry.transmittedChars).toBe(preview.totalChars);
    expect(entry.documentRefs).toEqual(SAMPLE_SOURCES.map((s) => s.ref));
  });

  it('a task cannot be resolved twice', async () => {
    const { boundary } = await setup();
    const preview = boundary.prepare('Evaluate', SAMPLE_SOURCES);
    await boundary.decline(preview.taskId);
    await expect(boundary.approve(preview.taskId)).rejects.toThrow();
  });

  it('persists the route log to the vault', async () => {
    const { root, boundary, inbox, local, cloud } = await setup();
    const preview = boundary.prepare('Evaluate', SAMPLE_SOURCES);
    await boundary.approve(preview.taskId);
    const reopened = await BoundaryService.open(path.join(root, 'boundary-log.json'), inbox, local, cloud);
    expect(reopened.getLog().length).toBe(1);
    expect(reopened.getLog()[0]!.route).toBe('cloud');
  });
});
