import Fastify, { type FastifyInstance } from 'fastify';
import { existsSync } from 'node:fs';
import { timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fastifyStatic from '@fastify/static';
import fastifyMultipart from '@fastify/multipart';
import type { AppContext } from './context.js';
import { registerLedgerRoutes } from './routes/ledger.js';
import { registerInboxRoutes } from './routes/inbox.js';
import { registerAssetRoutes } from './routes/assets.js';
import { registerBoundaryRoutes } from './routes/boundary.js';
import { registerPricingRoutes } from './routes/pricing.js';
import { registerConnectorRoutes } from './routes/connectors.js';

export function buildApp(ctx: AppContext): FastifyInstance {
  const app = Fastify({ logger: false, bodyLimit: 5 * 1024 * 1024 });

  // Multipart for audio/video recording uploads (transcribed on-device).
  app.register(fastifyMultipart, { limits: { fileSize: 500 * 1024 * 1024, files: 1 } });

  // Optional HTTP basic auth for a shared LAN/staging instance. Disabled unless
  // both env vars are set (so local single-operator use and tests need no auth).
  const user = process.env.ADAMAS_BASIC_USER;
  const pass = process.env.ADAMAS_BASIC_PASS;
  if (user && pass) {
    const expected = `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;
    app.addHook('onRequest', async (req, reply) => {
      if (req.raw.url === '/api/health') return;
      const provided = req.headers.authorization ?? '';
      const a = Buffer.from(provided);
      const b = Buffer.from(expected);
      const ok = a.length === b.length && timingSafeEqual(a, b);
      if (!ok) {
        reply.header('WWW-Authenticate', 'Basic realm="ADAMAS"').code(401).send({ error: 'Authentication required' });
      }
    });
  }

  // Hard data boundary: no external telemetry, no tracking. The only network
  // surface is this local API.
  app.get('/api/health', async () => ({ ok: true, name: 'ADAMAS' }));

  registerLedgerRoutes(app, ctx);
  registerInboxRoutes(app, ctx);
  registerAssetRoutes(app, ctx);
  registerBoundaryRoutes(app, ctx);
  registerPricingRoutes(app);
  registerConnectorRoutes(app, ctx);

  return app;
}

/** Serve the built web client (if present) with SPA fallback to index.html. */
export async function registerWebClient(app: FastifyInstance): Promise<boolean> {
  const here = path.dirname(fileURLToPath(import.meta.url));
  // dist/server/app.js -> project root is two levels up from dist/server
  const candidates = [
    path.resolve(here, '../../web-dist'),
    path.resolve(process.cwd(), 'web-dist'),
  ];
  const webRoot = candidates.find((c) => existsSync(path.join(c, 'index.html')));
  if (!webRoot) return false;

  await app.register(fastifyStatic, { root: webRoot, prefix: '/' });
  app.setNotFoundHandler((req, reply) => {
    if (req.raw.url && req.raw.url.startsWith('/api/')) {
      return reply.code(404).send({ error: 'Not found' });
    }
    return reply.sendFile('index.html');
  });
  return true;
}
