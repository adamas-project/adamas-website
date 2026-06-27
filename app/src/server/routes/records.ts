import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';
import { RECORD_CATEGORIES, type RecordCategory } from '../../records/schema.js';

function asCategory(v: unknown): RecordCategory | undefined {
  return typeof v === 'string' && (RECORD_CATEGORIES as readonly string[]).includes(v) ? (v as RecordCategory) : undefined;
}

function num(v: unknown): number | undefined {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : NaN;
  return Number.isFinite(n) ? n : undefined;
}

export function registerRecordRoutes(app: FastifyInstance, ctx: AppContext): void {
  const { records } = ctx;

  app.get('/api/records', async (req) => {
    const q = req.query as { q?: string; category?: string };
    return { records: records.list(q), categories: records.categories(), count: records.count };
  });

  app.get('/api/records/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const entry = records.get(id);
    if (!entry) return reply.code(404).send({ error: `No record ${id}` });
    return { entry };
  });

  app.post('/api/records', async (req, reply) => {
    const b = (req.body ?? {}) as Record<string, unknown>;
    const category = asCategory(b.category);
    const title = typeof b.title === 'string' ? b.title.trim() : '';
    if (!category) return reply.code(400).send({ error: `category must be one of ${RECORD_CATEGORIES.join(', ')}` });
    if (!title) return reply.code(400).send({ error: 'title is required.' });
    const summary = (typeof b.summary === 'string' ? b.summary.trim() : '') || title;
    const severity = b.severity === 'low' || b.severity === 'medium' || b.severity === 'high' ? b.severity : undefined;

    try {
      const entry = await records.create({
        category,
        title: title.slice(0, 200),
        summary,
        owner: typeof b.owner === 'string' && b.owner.trim() ? b.owner.trim() : undefined,
        status: typeof b.status === 'string' && b.status.trim() ? b.status.trim() : undefined,
        amount: num(b.amount),
        currency: typeof b.currency === 'string' && b.currency.trim() ? b.currency.trim() : undefined,
        recurring: typeof b.recurring === 'boolean' ? b.recurring : undefined,
        metric: typeof b.metric === 'string' && b.metric.trim() ? b.metric.trim() : undefined,
        period: typeof b.period === 'string' && b.period.trim() ? b.period.trim() : undefined,
        severity,
        mitigation: typeof b.mitigation === 'string' && b.mitigation.trim() ? b.mitigation.trim() : undefined,
        dueDate: typeof b.dueDate === 'string' && b.dueDate.trim() ? b.dueDate.trim() : undefined,
        source: typeof b.source === 'string' && b.source.trim() ? b.source.trim() : undefined,
        tags: Array.isArray(b.tags) ? (b.tags as unknown[]).map((t) => String(t).trim()).filter(Boolean) : undefined,
      });
      return reply.code(201).send({ entry });
    } catch (err) {
      return reply.code(422).send({ error: (err as Error).message });
    }
  });

  app.patch('/api/records/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const b = (req.body ?? {}) as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    if (typeof b.title === 'string') {
      const tt = b.title.trim();
      if (!tt) return reply.code(400).send({ error: 'title cannot be empty.' });
      patch.title = tt.slice(0, 200);
    }
    if (typeof b.summary === 'string' && b.summary.trim()) patch.summary = b.summary.trim();
    if (b.category !== undefined) {
      const c = asCategory(b.category);
      if (!c) return reply.code(400).send({ error: 'invalid category.' });
      patch.category = c;
    }
    if (b.owner !== undefined) patch.owner = String(b.owner).trim() || undefined;
    if (b.status !== undefined) patch.status = String(b.status).trim() || undefined;
    if (b.amount !== undefined) patch.amount = num(b.amount);
    if (b.currency !== undefined) patch.currency = String(b.currency).trim() || undefined;
    if (b.recurring !== undefined) patch.recurring = typeof b.recurring === 'boolean' ? b.recurring : undefined;
    if (b.metric !== undefined) patch.metric = String(b.metric).trim() || undefined;
    if (b.period !== undefined) patch.period = String(b.period).trim() || undefined;
    if (b.severity !== undefined) patch.severity = b.severity === 'low' || b.severity === 'medium' || b.severity === 'high' ? b.severity : undefined;
    if (b.mitigation !== undefined) patch.mitigation = String(b.mitigation).trim() || undefined;
    if (b.dueDate !== undefined) patch.dueDate = String(b.dueDate).trim() || undefined;
    if (b.source !== undefined) patch.source = String(b.source).trim() || undefined;
    if (b.tags !== undefined) patch.tags = Array.isArray(b.tags) ? (b.tags as unknown[]).map((t) => String(t).trim()).filter(Boolean) : undefined;
    try {
      const entry = await records.update(id, patch);
      if (!entry) return reply.code(404).send({ error: `No record ${id}` });
      return { entry };
    } catch (err) {
      return reply.code(422).send({ error: (err as Error).message });
    }
  });

  app.delete('/api/records/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const ok = await records.remove(id);
    if (!ok) return reply.code(404).send({ error: `No record ${id}` });
    return { removed: id };
  });
}
