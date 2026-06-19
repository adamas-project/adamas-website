import path from 'node:path';
import { scryptSync, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { Ledger } from '../ledger/ledger.js';
import { exportVault, importVault, type VaultExport } from '../ledger/export.js';
import type { CaptureInbox, StoredCandidate } from '../evaluation/inbox.js';
import { atomicWrite, readText, vaultPaths } from '../ledger/storage.js';

const MAGIC = 'ADAMASBK1';
const KEY_LEN = 32;
const SALT_LEN = 16;
const IV_LEN = 12;

export interface BackupPayload {
  format: 'adamas-backup';
  version: number;
  createdAt: string;
  vault: VaultExport;
  candidates: StoredCandidate[];
}

function deriveKey(passphrase: string, salt: Buffer): Buffer {
  return scryptSync(passphrase, salt, KEY_LEN);
}

/** Encrypt a payload with AES-256-GCM (scrypt-derived key). Output: magic | salt | iv | tag | ciphertext. */
export function encryptPayload(payload: BackupPayload, passphrase: string): Buffer {
  const salt = randomBytes(SALT_LEN);
  const iv = randomBytes(IV_LEN);
  const key = deriveKey(passphrase, salt);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from(MAGIC, 'utf8'), salt, iv, tag, ciphertext]);
}

export function decryptPayload(blob: Buffer, passphrase: string): BackupPayload {
  const magic = blob.subarray(0, MAGIC.length).toString('utf8');
  if (magic !== MAGIC) throw new Error('Not an ADAMAS encrypted backup.');
  let off = MAGIC.length;
  const salt = blob.subarray(off, (off += SALT_LEN));
  const iv = blob.subarray(off, (off += IV_LEN));
  const tag = blob.subarray(off, (off += 16));
  const ciphertext = blob.subarray(off);
  const key = deriveKey(passphrase, salt);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  let plaintext: Buffer;
  try {
    plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    throw new Error('Decryption failed — wrong passphrase or corrupted backup.');
  }
  return JSON.parse(plaintext.toString('utf8')) as BackupPayload;
}

export function buildBackupPayload(ledger: Ledger, inbox?: CaptureInbox): BackupPayload {
  return {
    format: 'adamas-backup',
    version: 1,
    createdAt: new Date().toISOString(),
    vault: exportVault(ledger),
    candidates: inbox ? inbox.all() : [],
  };
}

/** Write an encrypted backup of the full vault into the vault's backups dir. */
export async function writeEncryptedBackup(
  root: string,
  ledger: Ledger,
  passphrase: string,
  inbox?: CaptureInbox,
): Promise<string> {
  const blob = encryptPayload(buildBackupPayload(ledger, inbox), passphrase);
  const file = path.join(vaultPaths(root).backups, `vault-${Date.now()}.adamasbak`);
  await atomicWrite(file, blob.toString('base64'));
  return file;
}

/** Restore an encrypted backup file into a target vault root. */
export async function restoreEncryptedBackup(
  backupFile: string,
  passphrase: string,
  targetRoot: string,
): Promise<{ ledger: Ledger; candidates: StoredCandidate[] }> {
  const base64 = await readText(backupFile);
  const payload = decryptPayload(Buffer.from(base64, 'base64'), passphrase);
  const ledger = await importVault(targetRoot, payload.vault);
  if (payload.candidates.length) {
    await atomicWrite(
      path.join(targetRoot, 'candidates.json'),
      JSON.stringify({ version: 1, candidates: payload.candidates }, null, 2),
    );
  }
  return { ledger, candidates: payload.candidates };
}
