import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { FastifyInstance } from 'fastify';
// @ts-expect-error — plain ESM JS module shared with the deployed-instance CLI
import { runSmoke } from '../scripts/smoke.mjs';
import { seedVault } from '../src/seed/seed.js';
import { createContext } from '../src/server/context.js';
import { buildApp } from '../src/server/app.js';
import { tempVault } from './helpers.js';

let app: FastifyInstance;
let base: string;
let cleanup: () => void;

beforeAll(async () => {
  const v = tempVault();
  cleanup = v.cleanup;
  await seedVault(v.root);
  const ctx = await createContext(v.root);
  app = buildApp(ctx);
  await app.listen({ port: 0, host: '127.0.0.1' });
  const addr = app.server.address() as AddressInfo;
  base = `http://127.0.0.1:${addr.port}`;
});

afterAll(async () => {
  await app.close();
  cleanup();
});

describe('end-to-end smoke (real HTTP server)', () => {
  it('passes the full Definition-of-Done smoke against a live instance', async () => {
    const results = await runSmoke(base);
    const failed = results.filter((r: { ok: boolean }) => !r.ok);
    expect(failed, JSON.stringify(failed)).toHaveLength(0);
    expect(results.length).toBeGreaterThan(20);
  });
});
