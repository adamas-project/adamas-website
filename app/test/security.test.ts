import { describe, it, expect, afterEach, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { seedVault } from '../src/seed/seed.js';
import { createContext } from '../src/server/context.js';
import { buildApp } from '../src/server/app.js';
import { exportVault } from '../src/ledger/export.js';
import {
  encryptPayload,
  decryptPayload,
  buildBackupPayload,
  writeEncryptedBackup,
  restoreEncryptedBackup,
} from '../src/security/backup.js';
import { filterForRole, canSee } from '../src/security/rbac.js';
import { tempVault } from './helpers.js';

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
});

describe('role-based visibility', () => {
  it('hides finance from a restricted role and shows it to full-access roles', async () => {
    const { root, cleanup } = tempVault();
    cleanups.push(cleanup);
    const ledger = await seedVault(root);
    const all = ledger.list();
    const member = filterForRole(all, 'member');
    const owner = filterForRole(all, 'owner');
    const cfo = filterForRole(all, 'cfo');

    expect(member.some((d) => d.domain === 'finance')).toBe(false);
    expect(owner.some((d) => d.domain === 'finance')).toBe(true);
    expect(cfo.some((d) => d.domain === 'finance')).toBe(true);
    expect(member.length).toBeLessThan(owner.length);
    expect(canSee('member', 'sales')).toBe(true);
    expect(canSee('member', 'finance')).toBe(false);
  });
});

describe('encrypted backup / restore', () => {
  it('round-trips the full vault through an encrypted backup', async () => {
    const v1 = tempVault();
    cleanups.push(v1.cleanup);
    const ledger = await seedVault(v1.root);

    const blob = encryptPayload(buildBackupPayload(ledger), 'correct horse battery');
    const restored = decryptPayload(blob, 'correct horse battery');
    expect(restored.vault.count).toBe(14);

    const v2 = tempVault();
    cleanups.push(v2.cleanup);
    const file = await writeEncryptedBackup(v1.root, ledger, 'correct horse battery');
    const { ledger: ledger2 } = await restoreEncryptedBackup(file, 'correct horse battery', v2.root);
    expect(ledger2.list()).toEqual(ledger.list());
    expect(ledger2.linkSymmetryViolations()).toHaveLength(0);
  });

  it('fails to decrypt with the wrong passphrase', async () => {
    const { root, cleanup } = tempVault();
    cleanups.push(cleanup);
    const ledger = await seedVault(root);
    const blob = encryptPayload(buildBackupPayload(ledger), 'right-pass');
    expect(() => decryptPayload(blob, 'wrong-pass')).toThrow();
  });

  it('export is complete (every decision present in Markdown + JSON)', async () => {
    const { root, cleanup } = tempVault();
    cleanups.push(cleanup);
    const ledger = await seedVault(root);
    const bundle = exportVault(ledger);
    expect(bundle.count).toBe(ledger.count);
    expect(bundle.decisions).toHaveLength(ledger.count);
    expect(Object.keys(bundle.markdown)).toHaveLength(ledger.count);
  });
});

describe('security via API', () => {
  let app: FastifyInstance;
  let cleanup: () => void;

  beforeAll(async () => {
    const v = tempVault();
    cleanup = v.cleanup;
    await seedVault(v.root);
    const ctx = await createContext(v.root);
    app = buildApp(ctx);
    await app.ready();
  });
  afterAll(async () => {
    await app.close();
    cleanup();
  });

  it('list hides restricted entries for a restricted role', async () => {
    const member = (await app.inject({ method: 'GET', url: '/api/decisions?role=member' })).json();
    const owner = (await app.inject({ method: 'GET', url: '/api/decisions?role=owner' })).json();
    expect(member.decisions.some((d: any) => d.domain === 'finance')).toBe(false);
    expect(owner.decisions.some((d: any) => d.domain === 'finance')).toBe(true);
  });

  it('detail of a restricted entry is forbidden for a restricted role', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/decisions/FIN-016?role=member' });
    expect(res.statusCode).toBe(403);
    const ok = await app.inject({ method: 'GET', url: '/api/decisions/FIN-016?role=cfo' });
    expect(ok.statusCode).toBe(200);
  });

  it('boundary approve transmits and is logged; decline does not', async () => {
    // decline path
    const prep1 = (await app.inject({ method: 'POST', url: '/api/boundary/prepare', payload: { purpose: 'x' } })).json();
    const declined = (await app.inject({ method: 'POST', url: `/api/boundary/${prep1.preview.taskId}/decline` })).json();
    expect(declined.route).toBe('local');

    const before = (await app.inject({ method: 'GET', url: '/api/security' })).json().cloudTransmissions;

    const prep2 = (await app.inject({ method: 'POST', url: '/api/boundary/prepare', payload: { purpose: 'y' } })).json();
    const approved = (await app.inject({ method: 'POST', url: `/api/boundary/${prep2.preview.taskId}/approve` })).json();
    expect(approved.route).toBe('cloud');

    const status = (await app.inject({ method: 'GET', url: '/api/boundary/status' })).json();
    expect(status.cloudTransmissions).toBeGreaterThan(before);
    expect(status.log.some((e: any) => e.route === 'cloud')).toBe(true);
    expect(status.log.some((e: any) => e.route === 'local')).toBe(true);
  });

  it('backup requires a passphrase and produces an encrypted file', async () => {
    const bad = await app.inject({ method: 'POST', url: '/api/backup', payload: { passphrase: 'short' } });
    expect(bad.statusCode).toBe(400);
    const good = await app.inject({ method: 'POST', url: '/api/backup', payload: { passphrase: 'a-strong-passphrase' } });
    expect(good.statusCode).toBe(200);
    expect(good.json().encrypted).toBe(true);
  });
});
