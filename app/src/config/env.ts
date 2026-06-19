import path from 'node:path';

/** The vault root: where canonical Markdown + JSON live. Configurable via env. */
export function resolveVaultRoot(): string {
  const fromEnv = process.env.ADAMAS_VAULT;
  if (fromEnv && fromEnv.trim()) return path.resolve(fromEnv.trim());
  return path.resolve(process.cwd(), 'vault');
}

export function serverPort(): number {
  const p = process.env.ADAMAS_PORT;
  return p ? parseInt(p, 10) : 8787;
}

export function serverHost(): string {
  // Default to localhost — local-first, no inbound exposure by default.
  return process.env.ADAMAS_HOST ?? '127.0.0.1';
}

export type HermesProviderKind = 'local' | 'ollama';

export interface HermesConfig {
  /** Which local provider backs Hermes. `local` = built-in heuristic (offline,
   *  deterministic). `ollama` = a local Ollama model. Both run on-device. */
  provider: HermesProviderKind;
  ollamaUrl: string;
  ollamaModel: string;
}

/** Hermes (local evaluation) configuration, driven entirely by env vars. */
export function hermesConfig(): HermesConfig {
  const raw = (process.env.ADAMAS_HERMES_PROVIDER ?? 'local').trim().toLowerCase();
  const provider: HermesProviderKind = raw === 'ollama' ? 'ollama' : 'local';
  return {
    provider,
    ollamaUrl: (process.env.ADAMAS_OLLAMA_URL ?? 'http://127.0.0.1:11434').replace(/\/+$/, ''),
    ollamaModel: process.env.ADAMAS_OLLAMA_MODEL ?? 'llama3.1',
  };
}

