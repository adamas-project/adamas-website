import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { seedVault } from '../src/seed/seed.js';
import { createContext } from '../src/server/context.js';
import { buildApp } from '../src/server/app.js';
import { tempVault } from './helpers.js';

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

async function json(path: string) {
  const res = await app.inject({ method: 'GET', url: path });
  return { status: res.statusCode, body: res.json() };
}

describe('ledger API — filtering', () => {
  it('lists all 14 decisions', async () => {
    const { body } = await json('/api/decisions');
    expect(body.decisions).toHaveLength(14);
  });

  it('filters by domain', async () => {
    const { body } = await json('/api/decisions?domain=sales');
    expect(body.decisions.length).toBeGreaterThan(0);
    expect(body.decisions.every((d: any) => d.domain === 'sales')).toBe(true);
  });

  it('filters by status', async () => {
    const { body } = await json('/api/decisions?status=active');
    expect(body.decisions.every((d: any) => d.status === 'active')).toBe(true);
  });
});

describe('ledger API — link navigation', () => {
  it('returns a decision with its neighbors', async () => {
    const { status, body } = await json('/api/decisions/SAL-021');
    expect(status).toBe(200);
    expect(body.decision.id).toBe('SAL-021');
    expect(body.neighbors).toEqual(expect.arrayContaining(['FIN-016', 'SAL-017', 'OPS-020', 'PRD-019']));
  });

  it('404s for an unknown decision', async () => {
    const { status } = await json('/api/decisions/SAL-999');
    expect(status).toBe(404);
  });

  it('neighbors are reachable both ways (link navigation)', async () => {
    const { body } = await json('/api/decisions/FIN-016/neighbors');
    expect(body.neighbors).toContain('SAL-021');
  });
});

describe('ledger API — graph edges', () => {
  it('emits each undirected edge exactly once', async () => {
    const { body } = await json('/api/graph');
    expect(body.nodes).toHaveLength(14);
    // no duplicate edges, all normalized source < target
    const keys = body.edges.map((e: any) => `${e.source}__${e.target}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(body.edges.every((e: any) => e.source < e.target)).toBe(true);
  });

  it('includes the SAL-021 edges to its four linked decisions', async () => {
    const { body } = await json('/api/graph');
    const touching = body.edges.filter((e: any) => e.source === 'SAL-021' || e.target === 'SAL-021');
    const others = touching.map((e: any) => (e.source === 'SAL-021' ? e.target : e.source));
    expect(others).toEqual(expect.arrayContaining(['FIN-016', 'SAL-017', 'OPS-020', 'PRD-019']));
  });
});
