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
