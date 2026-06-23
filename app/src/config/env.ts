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

/** Folder ADAMAS writes the generated Obsidian data-room vault into. */
export function resolveObsidianDir(root: string): string {
  const fromEnv = process.env.ADAMAS_OBSIDIAN_DIR;
  if (fromEnv && fromEnv.trim()) return path.resolve(fromEnv.trim());
  return path.join(root, 'obsidian');
}

/** Whether to auto-refresh the Obsidian vault on every change (default on). */
export function obsidianAutoEnabled(): boolean {
  const raw = (process.env.ADAMAS_OBSIDIAN_AUTO ?? '1').trim().toLowerCase();
  return raw !== '0' && raw !== 'false' && raw !== 'off';
}

/** Minutes between automatic connector pulls; 0 (default) disables auto-pull. */
export function connectorPullMinutes(): number {
  const n = Number(process.env.ADAMAS_CONNECTOR_PULL_MINUTES ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Whether the feedback learning loop is active (default on). */
export function learningEnabled(): boolean {
  const raw = (process.env.ADAMAS_LEARNING ?? '1').trim().toLowerCase();
  return raw !== '0' && raw !== 'false' && raw !== 'off';
}

/**
 * Autopilot: confidence threshold (0..1) at or above which captured candidates
 * are auto-confirmed into the ledger without a click. 0 (default) keeps every
 * candidate in the review inbox. Recommended ~0.8 for hands-off operation.
 */
export function autoConfirmConfidence(): number {
  const n = Number(process.env.ADAMAS_AUTO_CONFIRM_CONFIDENCE ?? 0);
  return Number.isFinite(n) && n > 0 && n <= 1 ? n : 0;
}

/** Folder the local-folder connector reads source material from. */
export function resolveSourcesDir(root: string): string {
  const fromEnv = process.env.ADAMAS_SOURCES_DIR;
  if (fromEnv && fromEnv.trim()) return path.resolve(fromEnv.trim());
  return path.join(root, 'sources');
}

export interface ImapConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  tls: boolean;
  mailbox: string;
  /** Max messages to pull per run (most recent first). */
  max: number;
}

export interface TranscribeConfig {
  /** Shell command template with {input} (audio path) and optional {output}. */
  cmd: string;
  timeoutMs: number;
}

/** Local speech-to-text command config; null when unset (opt-in, on-device). */
export function transcribeConfig(): TranscribeConfig | null {
  const cmd = process.env.ADAMAS_TRANSCRIBE_CMD?.trim();
  if (!cmd) return null;
  return { cmd, timeoutMs: Number(process.env.ADAMAS_TRANSCRIBE_TIMEOUT_MS ?? 600000) };
}

export interface IcsConfig {
  url: string;
  name: string;
}

/** Read Google Calendar (iCal feed) config from env; null when unset (opt-in). */
export function icsConfig(): IcsConfig | null {
  const url = process.env.ADAMAS_ICS_URL?.trim();
  if (!url) return null;
  return { url, name: process.env.ADAMAS_ICS_NAME?.trim() || 'Calendar' };
}

/** Read IMAP connector config from env; null when not configured (opt-in). */
export function imapConfig(): ImapConfig | null {
  const host = process.env.ADAMAS_IMAP_HOST?.trim();
  const user = process.env.ADAMAS_IMAP_USER?.trim();
  const pass = process.env.ADAMAS_IMAP_PASS;
  if (!host || !user || !pass) return null;
  return {
    host,
    port: Number(process.env.ADAMAS_IMAP_PORT ?? 993),
    user,
    pass,
    tls: (process.env.ADAMAS_IMAP_TLS ?? 'true').toLowerCase() !== 'false',
    mailbox: process.env.ADAMAS_IMAP_MAILBOX?.trim() || 'INBOX',
    max: Number(process.env.ADAMAS_IMAP_MAX ?? 25),
  };
}

export type HermesProviderKind = 'local' | 'ollama';

export interface HermesConfig {
  /** Which local provider backs Hermes. `local` = built-in heuristic (offline,
   *  deterministic). `ollama` = a local Ollama model. Both run on-device. */
  provider: HermesProviderKind;
  ollamaUrl: string;
  ollamaModel: string;
  /** Route cheap-first: heuristic handles easy cases, Ollama only when unsure. */
  router: boolean;
  routerMinConfidence: number;
}

/** Hermes (local evaluation) configuration, driven entirely by env vars. */
export function hermesConfig(): HermesConfig {
  const raw = (process.env.ADAMAS_HERMES_PROVIDER ?? 'local').trim().toLowerCase();
  const provider: HermesProviderKind = raw === 'ollama' ? 'ollama' : 'local';
  const routerRaw = (process.env.ADAMAS_HERMES_ROUTER ?? '1').trim().toLowerCase();
  const minC = Number(process.env.ADAMAS_ROUTER_MIN_CONFIDENCE ?? 0.75);
  return {
    provider,
    ollamaUrl: (process.env.ADAMAS_OLLAMA_URL ?? 'http://127.0.0.1:11434').replace(/\/+$/, ''),
    ollamaModel: process.env.ADAMAS_OLLAMA_MODEL ?? 'llama3.1',
    router: routerRaw !== '0' && routerRaw !== 'false' && routerRaw !== 'off',
    routerMinConfidence: Number.isFinite(minC) && minC > 0 && minC <= 1 ? minC : 0.75,
  };
}

