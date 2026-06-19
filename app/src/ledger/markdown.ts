import { assertDecision } from '../schema/validate.js';
import type { Decision } from '../schema/decision.schema.js';

// A decision is stored as one Markdown file. The canonical data lives in a JSON
// front-matter block (between `---adamas` fences); the body below is a
// human-readable rendering regenerated on every write. Parsing only trusts the
// JSON block, so the file stays both machine-exact and human-portable.

const FENCE = '---adamas';

function section(heading: string, body: string): string {
  return `## ${heading}\n\n${body}\n`;
}

function list(items: string[] | undefined): string {
  if (!items || items.length === 0) return '_none_';
  return items.map((i) => `- ${i}`).join('\n');
}

export function serializeDecision(d: Decision): string {
  const json = JSON.stringify(d, null, 2);
  const owner = d.owner.name ? `${d.owner.role} (${d.owner.name})` : d.owner.role;
  const dissent = d.owner.dissent && d.owner.dissent.length > 0 ? d.owner.dissent.join(', ') : '_none recorded_';

  const parts: string[] = [];
  parts.push(`${FENCE}\n${json}\n${FENCE}\n`);
  parts.push(`# ${d.title}\n`);
  parts.push(
    `**ID:** ${d.id} · **Domain:** ${d.domain} · **Date:** ${d.date} · **Status:** ${d.status ?? 'active'}` +
      (d.superseded_by ? ` · **Superseded by:** ${d.superseded_by}` : '') +
      '\n',
  );
  parts.push(section('Context', d.context));
  parts.push(section('Decision', d.decision));
  parts.push(section('Owner', `**Role:** ${owner}\n\n**Dissent:** ${dissent}`));
  parts.push(section('Trade-offs', list(d.tradeoffs)));
  parts.push(section('Links', list(d.links)));
  parts.push(section('Sources', list(d.sources)));
  return parts.join('\n');
}

export function parseDecision(markdown: string): Decision {
  const start = markdown.indexOf(FENCE);
  if (start === -1) throw new Error('Not an ADAMAS decision file: missing front-matter fence');
  const afterStart = start + FENCE.length;
  const end = markdown.indexOf(FENCE, afterStart);
  if (end === -1) throw new Error('Malformed ADAMAS decision file: unterminated front-matter');
  const jsonText = markdown.slice(afterStart, end).trim();
  let data: unknown;
  try {
    data = JSON.parse(jsonText);
  } catch (err) {
    throw new Error(`Malformed ADAMAS decision JSON: ${(err as Error).message}`, { cause: err });
  }
  assertDecision(data);
  return data;
}
