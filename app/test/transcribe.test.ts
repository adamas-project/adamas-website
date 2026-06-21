import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync, promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { CommandTranscriber } from '../src/ingestion/transcribe.js';
import { transcribeConfig } from '../src/config/env.js';

const ENV = { ...process.env };
const cleanups: Array<() => void> = [];
afterEach(() => {
  process.env = { ...ENV };
  while (cleanups.length) cleanups.pop()!();
});

function tmpFile(content: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'adamas-aud-'));
  cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
  const p = path.join(dir, 'clip.wav');
  // not real audio — the stub "engine" just echoes the bytes as the transcript
  fs.writeFile(p, content);
  return p;
}

describe('CommandTranscriber', () => {
  it('captures transcript from stdout', async () => {
    const input = tmpFile('We decided to adopt a four-day week. Owner: founder.');
    // wait for the file to be written
    await new Promise((r) => setTimeout(r, 20));
    const t = new CommandTranscriber('cat {input}');
    const out = await t.transcribe(input);
    expect(out).toMatch(/four-day week/);
  });

  it('reads transcript from an {output} file', async () => {
    const input = tmpFile('We decided to dual-source servo drives. Owner: head of ops.');
    await new Promise((r) => setTimeout(r, 20));
    const t = new CommandTranscriber('cp {input} {output}');
    const out = await t.transcribe(input);
    expect(out).toMatch(/dual-source servo drives/);
    // the temp output file is cleaned up
    expect(await fs.readFile(`${input}.txt`, 'utf8').then(() => true).catch(() => false)).toBe(false);
  });

  it('rejects on a failing command', async () => {
    const input = tmpFile('x');
    await new Promise((r) => setTimeout(r, 20));
    const t = new CommandTranscriber('exit 3');
    await expect(t.transcribe(input)).rejects.toThrow();
  });
});

describe('transcribe config gating (opt-in)', () => {
  it('is null unless ADAMAS_TRANSCRIBE_CMD is set', () => {
    delete process.env.ADAMAS_TRANSCRIBE_CMD;
    expect(transcribeConfig()).toBeNull();
  });
  it('reads the command when set', () => {
    process.env.ADAMAS_TRANSCRIBE_CMD = 'whisper-cli -m model -f {input} -nt';
    expect(transcribeConfig()?.cmd).toContain('whisper-cli');
  });
});
