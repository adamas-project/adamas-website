import type { FastifyInstance } from 'fastify';
import type { AppContext } from '../context.js';
import { summarizeKnowledge } from '../../knowledge/summarize.js';
import { PERSON_KINDS, type PersonKind } from '../../people/schema.js';

function asKind(v: unknown): PersonKind | undefined {
  return typeof v === 'string' && (PERSON_KINDS as readonly string[]).includes(v) ? (v as PersonKind) : undefined;
}

export function registerPeopleRoutes(app: FastifyInstance, ctx: AppContext): void {
  const { people, localProvider } = ctx;

  app.get('/api/people', async (req) => {
    const q = req.query as { q?: string; kind?: string };
    return { people: people.list(q), count: people.count };
  });

  app.get('/api/people/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const entry = people.get(id);
    if (!entry) return reply.code(404).send({ error: `No person ${id}` });
    return { entry };
  });

  // Add a team member. If a CV is pasted, summarize it locally into a bio,
  // highlights, and skills; otherwise use the provided bio.
  app.post('/api/people', async (req, reply) => {
    const body = (req.body ?? {}) as {
      name?: string;
      role?: string;
      kind?: string;
      cv?: string;
      bio?: string;
      skills?: string[];
      keyPerson?: boolean;
      startDate?: string;
      location?: string;
      email?: string;
    };
    const name = body.name?.trim();
    const role = body.role?.trim();
    if (!name || !role) return reply.code(400).send({ error: 'name and role are required.' });
    const kind = asKind(body.kind) ?? 'employee';

    try {
      const cv = body.cv?.trim();
      let summary = body.bio?.trim() ?? '';
      let highlights: string[] = [];
      let skills = (body.skills ?? []).map((s) => s.trim()).filter(Boolean);

      if (cv) {
        const kn = await summarizeKnowledge(localProvider, cv);
        summary = summary || kn.summary;
        highlights = kn.takeaways;
        skills = [...new Set([...skills, ...kn.tags])].slice(0, 12);
      }
      if (!summary) summary = `${role}.`;

      const entry = await people.create({
        name: name.slice(0, 200),
        role: role.slice(0, 200),
        kind,
        summary,
        ...(highlights.length ? { highlights } : {}),
        ...(skills.length ? { skills } : {}),
        ...(body.keyPerson ? { keyPerson: true } : {}),
        ...(body.startDate ? { startDate: body.startDate } : {}),
        ...(body.location ? { location: body.location.trim() } : {}),
        ...(body.email ? { email: body.email.trim() } : {}),
        ...(cv ? { excerpt: cv.slice(0, 500) } : {}),
      });
      return reply.code(201).send({ entry });
    } catch (err) {
      return reply.code(422).send({ error: (err as Error).message });
    }
  });

  app.delete('/api/people/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const ok = await people.remove(id);
    if (!ok) return reply.code(404).send({ error: `No person ${id}` });
    return { removed: id };
  });
}
