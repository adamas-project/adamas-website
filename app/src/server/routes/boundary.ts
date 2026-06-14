import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';
import { SAMPLE_SOURCES } from '../../evaluation/fixtures.js';
import { writeEncryptedBackup } from '../../security/backup.js';
import { DEFAULT_POLICY } from '../../security/rbac.js';

export function registerBoundaryRoutes(app: FastifyInstance, ctx: AppContext): void {
  const { boundary, cloudProvider, ledger, inbox } = ctx;

  app.get('/api/boundary/status', async () => ({
    localFirstByDefault: true,
    cloudTransmissions: cloudProvider.transmissions,
    cloudArmed: cloudProvider.isArmed,
    log: boundary.getLog(),
  }));

  // Step 1: prepare a hybrid task — returns exactly what WOULD be transmitted.
  app.post('/api/boundary/prepare', async (req) => {
    const body = (req.body ?? {}) as { purpose?: string; sources?: typeof SAMPLE_SOURCES };
    const preview = boundary.prepare(body.purpose ?? 'Evaluate sources with the cloud model', body.sources ?? SAMPLE_SOURCES);
    return { preview };
  });

  app.get('/api/boundary/:taskId', async (req, reply) => {
    const { taskId } = req.params as { taskId: string };
    const task = boundary.getTask(taskId);
    if (!task) return reply.code(404).send({ error: `No task ${taskId}` });
    return { task };
  });

  // Step 2a: approve -> cloud route (transmits).
  app.post('/api/boundary/:taskId/approve', async (req, reply) => {
    const { taskId } = req.params as { taskId: string };
    try {
      return await boundary.approve(taskId);
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message });
    }
  });

  // Step 2b: decline -> local route (no transmission).
  app.post('/api/boundary/:taskId/decline', async (req, reply) => {
    const { taskId } = req.params as { taskId: string };
    try {
      return await boundary.decline(taskId);
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message });
    }
  });

  // Security posture + encrypted backup.
  app.get('/api/security', async () => ({
    localFirst: true,
    externalTelemetry: false,
    trackingCookies: false,
    restrictedDomains: DEFAULT_POLICY.restrictedDomains,
    fullAccessRoles: DEFAULT_POLICY.fullAccessRoles,
    cloudTransmissions: cloudProvider.transmissions,
  }));

  app.post('/api/backup', async (req, reply) => {
    const body = (req.body ?? {}) as { passphrase?: string };
    if (!body.passphrase || body.passphrase.length < 8) {
      return reply.code(400).send({ error: 'A passphrase of at least 8 characters is required.' });
    }
    const file = await writeEncryptedBackup(ctx.root, ledger, body.passphrase, inbox);
    return { file, encrypted: true, algorithm: 'aes-256-gcm' };
  });
}
