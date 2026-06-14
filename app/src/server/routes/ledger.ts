import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';
import { buildGraph, neighbors } from '../../ledger/graph.js';
import { exportVault } from '../../ledger/export.js';
import { LedgerError } from '../../ledger/ledger.js';
import { ValidationError } from '../../schema/validate.js';
import { DOMAINS, STATUSES, type Domain, type Status } from '../../schema/decision.schema.js';

function asDomain(v: unknown): Domain | undefined {
  return typeof v === 'string' && (DOMAINS as readonly string[]).includes(v) ? (v as Domain) : undefined;
}
function asStatus(v: unknown): Status | undefined {
  return typeof v === 'string' && (STATUSES as readonly string[]).includes(v) ? (v as Status) : undefined;
}

export function registerLedgerRoutes(app: FastifyInstance, ctx: AppContext): void {
  const { ledger } = ctx;

  app.get('/api/meta', async () => ({
    name: 'ADAMAS',
    count: ledger.count,
    version: ledger.version,
    domains: DOMAINS,
    statuses: STATUSES,
  }));

  app.get('/api/decisions', async (req) => {
    const q = req.query as Record<string, string>;
    const filter: { domain?: Domain; status?: Status } = {};
    const d = asDomain(q.domain);
    const s = asStatus(q.status);
    if (d) filter.domain = d;
    if (s) filter.status = s;
    return { decisions: ledger.list(filter) };
  });

  app.get('/api/decisions/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const decision = ledger.get(id);
    if (!decision) return reply.code(404).send({ error: `No decision ${id}` });
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
