import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createContext } from '../src/server/context.js';
import { buildApp } from '../src/server/app.js';
import { tempVault } from './helpers.js';

describe('branding + gmail auto-label API', () => {
  let app: FastifyInstance;
  let cleanup: () => void;
  beforeAll(async () => {
    const v = tempVault();
    cleanup = v.cleanup;
    app = buildApp(await createContext(v.root));
    await app.ready();
  });
  afterAll(async () => {
    await app.close();
    cleanup();
  });

  it('defaults, updates, and validates brand', async () => {
    const def = (await app.inject({ method: 'GET', url: '/api/brand' })).json();
    expect(def.companyName).toBe('ADAMAS');

    const put = await app.inject({ method: 'PUT', url: '/api/brand', payload: { companyName: 'NorthPeak', tagline: 'We automate.', accentColor: '#22aa55' } });
    expect(put.statusCode).toBe(200);
    expect(put.json().companyName).toBe('NorthPeak');

    // Persists across a fresh GET.
    expect((await app.inject({ method: 'GET', url: '/api/brand' })).json().accentColor).toBe('#22aa55');

    // Bad hex is rejected.
    expect((await app.inject({ method: 'PUT', url: '/api/brand', payload: { accentColor: 'red' } })).statusCode).toBe(400);
    // Empty company name falls back to ADAMAS.
    expect((await app.inject({ method: 'PUT', url: '/api/brand', payload: { companyName: '   ' } })).json().companyName).toBe('ADAMAS');
  });

  it('enables gmail auto-labeling only after credentials exist', async () => {
    // No credentials yet → cannot enable.
    expect((await app.inject({ method: 'POST', url: '/api/gmail/auto-label', payload: { minutes: 60 } })).statusCode).toBe(400);

    await app.inject({ method: 'POST', url: '/api/gmail/settings', payload: { user: 'demo@gmail.com', pass: 'app-password-here' } });
    const on = await app.inject({ method: 'POST', url: '/api/gmail/auto-label', payload: { minutes: 60 } });
    expect(on.statusCode).toBe(200);
    expect(on.json().autoLabelMinutes).toBe(60);

    // Reflected in status, and can be turned off.
    expect((await app.inject({ method: 'GET', url: '/api/gmail/status' })).json().autoLabelMinutes).toBe(60);
    await app.inject({ method: 'POST', url: '/api/gmail/auto-label', payload: { minutes: 0 } });
    expect((await app.inject({ method: 'GET', url: '/api/gmail/status' })).json().autoLabelMinutes).toBe(0);
  });
});
