import path from 'node:path';
import { promises as fs } from 'node:fs';
import { imapConfig, type ImapConfig } from '../config/env.js';

// Lets the operator configure Gmail from the app (paste address + app password)
// instead of editing a .env file. Stored locally on this machine only, in the
// data volume — same trust level as the .env it replaces (single-operator,
// local-first). Saved settings take priority over the ADAMAS_IMAP_* env vars.

export interface GmailSettings {
  host: string;
  user: string;
  pass: string;
  /** Auto-label decision emails every N minutes (0/undefined = off). */
  autoLabelMinutes?: number;
}

function settingsFile(root: string): string {
  return path.join(root, 'gmail-settings.json');
}

export async function loadGmailSettings(root: string): Promise<GmailSettings | null> {
  try {
    const s = JSON.parse(await fs.readFile(settingsFile(root), 'utf8')) as Partial<GmailSettings>;
    if (s.host && s.user && s.pass) {
      return { host: s.host, user: s.user, pass: s.pass, ...(s.autoLabelMinutes ? { autoLabelMinutes: s.autoLabelMinutes } : {}) };
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveGmailSettings(root: string, s: GmailSettings): Promise<void> {
  // Merge so saving credentials preserves the auto-label interval and vice versa.
  const cur = (await loadGmailSettings(root)) ?? undefined;
  const next = { ...cur, ...s };
  // 0600 so only the owner can read the stored app password.
  await fs.writeFile(settingsFile(root), JSON.stringify(next, null, 2), { mode: 0o600 });
}

/** Set just the auto-label interval (preserving credentials). */
export async function setAutoLabelMinutes(root: string, minutes: number): Promise<GmailSettings | null> {
  const cur = await loadGmailSettings(root);
  if (!cur) return null;
  const next: GmailSettings = { ...cur, autoLabelMinutes: minutes > 0 ? minutes : undefined };
  await fs.writeFile(settingsFile(root), JSON.stringify(next, null, 2), { mode: 0o600 });
  return next;
}

export async function clearGmailSettings(root: string): Promise<void> {
  await fs.rm(settingsFile(root), { force: true });
}

/** Resolve the active mailbox config: saved settings first, then env vars. */
export async function resolveImapConfig(
  root: string,
): Promise<{ cfg: ImapConfig | null; source: 'saved' | 'env' | null }> {
  const saved = await loadGmailSettings(root);
  if (saved) {
    return {
      cfg: { host: saved.host, port: 993, user: saved.user, pass: saved.pass, tls: true, mailbox: 'INBOX', max: 25 },
      source: 'saved',
    };
  }
  const env = imapConfig();
  return { cfg: env, source: env ? 'env' : null };
}
