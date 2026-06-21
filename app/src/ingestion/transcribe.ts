import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';

// Pluggable, on-device speech-to-text. ADAMAS doesn't bundle a model; instead the
// operator points it at a local engine (e.g. whisper.cpp) via a command template,
// so transcription stays on the machine and the engine is swappable.

export interface Transcriber {
  readonly engine: string;
  /** Transcribe an audio/video file at `inputPath` to plain text. */
  transcribe(inputPath: string): Promise<string>;
}

function shQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

function run(cmd: string, args: string[], timeoutMs: number): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`Transcription timed out after ${Math.round(timeoutMs / 1000)}s`));
    }, timeoutMs);
    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`Transcription command exited ${code}: ${stderr.slice(0, 500)}`));
    });
  });
}

/**
 * Runs an operator-configured local command (trusted, from env) to transcribe.
 * `{input}` is replaced with the (app-generated) audio path; if `{output}` is
 * present the transcript is read from that file, otherwise from stdout.
 */
export class CommandTranscriber implements Transcriber {
  readonly engine = 'command';

  constructor(
    private readonly cmd: string,
    private readonly timeoutMs = 600000,
  ) {}

  async transcribe(inputPath: string): Promise<string> {
    const usesOutput = this.cmd.includes('{output}');
    const outputPath = usesOutput ? `${inputPath}.txt` : '';
    const final = this.cmd
      .replaceAll('{input}', shQuote(inputPath))
      .replaceAll('{output}', shQuote(outputPath));

    const { stdout } = await run('sh', ['-c', final], this.timeoutMs);

    if (usesOutput) {
      const text = await fs.readFile(outputPath, 'utf8').catch(() => '');
      await fs.rm(outputPath, { force: true }).catch(() => {});
      return text.trim();
    }
    return stdout.trim();
  }
}
