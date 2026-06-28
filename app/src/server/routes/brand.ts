import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';
import { loadBrand, saveBrand } from '../brand.js';

// Hex color like #aabbcc or #abc; empty string is allowed (= reset to default).
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function registerBrandRoutes(app: FastifyInstance, ctx: AppContext): void {
  app.get('/api/brand', async () => loadBrand(ctx.root));

  app.put('/api/brand', async (req, reply) => {
    const b = (req.body ?? {}) as { companyName?: string; tagline?: string; accentColor?: string };
    const patch: Record<string, string> = {};
    if (typeof b.companyName === 'string') patch.companyName = b.companyName.trim().slice(0, 80) || 'ADAMAS';
    if (typeof b.tagline === 'string') patch.tagline = b.tagline.trim().slice(0, 160);
    if (typeof b.accentColor === 'string') {
      const c = b.accentColor.trim();
      if (c && !HEX.test(c)) return reply.code(400).send({ error: 'accentColor must be a hex color like #c9a84c.' });
      patch.accentColor = c;
    }
    return saveBrand(ctx.root, patch);
  });
}
