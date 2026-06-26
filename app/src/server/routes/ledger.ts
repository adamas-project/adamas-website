import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';
import { buildGraph, buildMemoryGraph, neighbors } from '../../ledger/graph.js';
import { exportVault } from '../../ledger/export.js';
import { LedgerError } from '../../ledger/ledger.js';
import { ValidationError } from '../../schema/validate.js';
import { DOMAINS, STATUSES, type Domain, type Status } from '../../schema/decision.schema.js';
import { canSee, filterForRole, DEFAULT_ROLE } from '../../security/rbac.js';
import type { FastifyRequest } from 'fastify';

function asDomain(v: unknown): Domain | undefined {
  return typeof v === 'string' && (DOMAINS as readonly string[]).includes(v) ? (v as Domain) : undefined;
}
function asStatus(v: unknown): Status | undefined {
  return typeof v === 'string' && (STATUSES as readonly string[]).includes(v) ? (v as Status) : undefined;
}

// Role for role-based visibility: query ?role=, header x-adamas-role, else owner.
function roleOf(req: FastifyRequest): string {
  const q = (req.query as Record<string, string>)?.role;
  const h = req.headers['x-adamas-role'];
  return q || (typeof h === 'string' ? h : undefined) || DEFAULT_ROLE;
}

export function registerLedgerRoutes(app: FastifyInstance, ctx: AppContext): void {
  const { ledger } = ctx;

  app.get('/api/meta', async () => ({
    name: 'ADAMAS',
    count: ledger.count,
    version: ledger.version,
    domains: DOMAINS,
    statuses: STATUSES,
    hermes: {
      provider: ctx.hermes.provider,
      location: ctx.localProvider.location,
      router: ctx.hermes.provider === 'ollama' && ctx.hermes.router,
      ...(ctx.hermes.provider === 'ollama'
        ? { ollamaUrl: ctx.hermes.ollamaUrl, model: ctx.hermes.ollamaModel }
        : {}),
    },
  }));

  app.get('/api/decisions', async (req) => {
    const q = req.query as Record<string, string>;
    const filter: { domain?: Domain; status?: Status } = {};
    const d = asDomain(q.domain);
    const s = asStatus(q.status);
    if (d) filter.domain = d;
    if (s) filter.status = s;
    const role = roleOf(req);
    return { role, decisions: filterForRole(ledger.list(filter), role) };
  });

  app.get('/api/decisions/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const decision = ledger.get(id);
    if (!decision) return reply.code(404).send({ error: `No decision ${id}` });
    // Role-based visibility: restricted-domain entries are hidden, not leaked.
    if (!canSee(roleOf(req), decision.domain)) {
      return reply.code(403).send({ error: `Not visible to role`, restricted: true });
    }
    return { decision, neighbors: neighbors(ledger, id) };
  });

  app.get('/api/decisions/:id/neighbors', async (req) => {
    const { id } = req.params as { id: string };
    return { id, neighbors: neighbors(ledger, id) };
  });

  app.post('/api/decisions', async (req, reply) => {
    try {
      const created = await ledger.create(req.body as any);
      return reply.code(201).send({ decision: created });
    } catch (err) {
      return handleWriteError(reply, err);
    }
  });

  app.patch('/api/decisions/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    try {
      const updated = await ledger.update(id, req.body as any);
      return { decision: updated };
    } catch (err) {
      return handleWriteError(reply, err);
    }
  });

  app.post('/api/decisions/:id/supersede', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as { successorId?: string; successor?: any };
    try {
      const result = await ledger.supersede(id, body.successorId ?? body.successor);
      return result;
    } catch (err) {
      return handleWriteError(reply, err);
    }
  });

  app.post('/api/decisions/:id/reverse', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as { successorId?: string; successor?: any };
    try {
      const result = await ledger.reverse(id, body.successorId ?? body.successor);
      return result;
    } catch (err) {
      return handleWriteError(reply, err);
    }
  });

  app.get('/api/graph', async () => buildGraph(ledger));

  // Combined "second brain" graph: decisions + knowledge, structured like the
  // Obsidian vault (hubs + bi-links + topic cross-links). Powers the 3D view.
  app.get('/api/graph/memory', async (req) => {
    const q = (req.query as Record<string, string>) ?? {};
    const topics = q.topics === '1';
    // Bound the rendered graph by default (the 3D view slows past a few hundred
    // nodes); `limit=0` returns the whole graph for power users who accept it.
    const limit = q.limit != null ? Math.max(0, Number(q.limit) || 0) : 600;
    return buildMemoryGraph(ledger, ctx.knowledge, { topics, people: ctx.people, records: ctx.records, limit });
  });

  app.get('/api/export', async (_req, reply) => {
    reply.header('content-disposition', 'attachment; filename="adamas-vault.json"');
    return exportVault(ledger);
  });
}

function handleWriteError(reply: any, err: unknown) {
  if (err instanceof ValidationError) return reply.code(400).send({ error: err.message, errors: err.errors });
  if (err instanceof LedgerError) return reply.code(409).send({ error: err.message });
  throw err;
}
