import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';

export function registerAssetRoutes(app: FastifyInstance, ctx: AppContext): void {
  const { assets } = ctx;

  app.get('/api/assets', async () => ({
    assets: assets.registry(),
    autoRegenerate: assets.autoRegenerateEnabled,
  }));

  app.get('/api/assets/dependencies', async () => ({ graph: assets.dependencyGraph() }));

  app.get('/api/assets/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const generated = assets.get(id);
    const entry = assets.registry().find((a) => a.id === id);
    if (!entry) return reply.code(404).send({ error: `No asset ${id}` });
    return { entry, asset: generated ?? null };
  });

  app.get('/api/assets/:id/markdown', async (req, reply) => {
    const { id } = req.params as { id: string };
    const generated = assets.get(id);
    if (!generated) return reply.code(404).send({ error: `Asset ${id} not generated yet` });
    reply.header('content-type', 'text/markdown; charset=utf-8');
    return generated.markdown;
  });

  app.post('/api/assets/:id/generate', async (req, reply) => {
    const { id } = req.params as { id: string };
    try {
      return { asset: await assets.generate(id) };
    } catch (err) {
      return reply.code(404).send({ error: (err as Error).message });
    }
  });

  app.post('/api/assets/:id/regenerate', async (req, reply) => {
    const { id } = req.params as { id: string };
    try {
      return { asset: await assets.regenerate(id) };
    } catch (err) {
      return reply.code(404).send({ error: (err as Error).message });
    }
  });

  app.post('/api/assets/auto-regenerate', async (req) => {
    const body = (req.body ?? {}) as { on?: boolean };
    assets.setAutoRegenerate(Boolean(body.on));
    return { autoRegenerate: assets.autoRegenerateEnabled };
  });
}
