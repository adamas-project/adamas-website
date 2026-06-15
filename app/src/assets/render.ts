import type { Decision } from '../schema/decision.schema.js';
import type { GeneratedAsset, GeneratedSection, GenerationHeader } from './types.js';

function renderDecision(d: Decision): string {
  const owner = d.owner.name ? `${d.owner.role} (${d.owner.name})` : d.owner.role;
  const dissent = d.owner.dissent && d.owner.dissent.length ? d.owner.dissent.join(', ') : 'none recorded';
  const lines: string[] = [];
  lines.push(`### ${d.id} — ${d.title}`);
  lines.push(`*${d.domain} · ${d.date} · status: ${d.status ?? 'active'}${d.superseded_by ? ` · superseded by ${d.superseded_by}` : ''}*`);
  lines.push('');
  lines.push(`**Decision.** ${d.decision}`);
  lines.push('');
  lines.push(`**Why (context).** ${d.context}`);
  lines.push('');
  lines.push(`**Owner.** ${owner} — **Dissent:** ${dissent}`);
  if (d.tradeoffs && d.tradeoffs.length) {
    lines.push('');
    lines.push('**Trade-offs.**');
    for (const t of d.tradeoffs) lines.push(`- ${t}`);
  }
  if (d.sources && d.sources.length) {
    lines.push('');
    lines.push(`**Sources.** ${d.sources.join('; ')}`);
  }
  return lines.join('\n');
}

/** Render one section with its SRC tag (both stored and visible). */
export function renderSection(section: GeneratedSection, decisions: Decision[]): string {
  const src = section.src.join(', ');
  const parts: string[] = [];
  parts.push(`## ${section.heading}    SRC: ${src}`);
  if (section.blurb) parts.push(`\n_${section.blurb}_`);
  parts.push('');
  parts.push(decisions.map(renderDecision).join('\n\n'));
  return parts.join('\n');
}

function renderHeader(title: string, summary: string, h: GenerationHeader): string {
  return [
    `# ${title}`,
    '',
    `> _${summary}_`,
    '',
    '<!-- generation-header -->',
    `**Generated:** ${h.generatedAt}  `,
    `**Source ledger version:** ${h.ledgerVersion}  `,
    `**Ledger decision count:** ${h.ledgerDecisionCount}  `,
    `**Source decisions in this asset:** ${h.sourceDecisionCount}`,
    '',
    '---',
    '',
  ].join('\n');
}

/** Assemble the full Markdown document for a generated asset. */
export function renderAsset(
  asset: Omit<GeneratedAsset, 'markdown'>,
  decisionsBySection: Record<string, Decision[]>,
): string {
  const head = renderHeader(asset.title, asset.summary, asset.header);
  if (asset.sections.length === 0) {
    return (
      head +
      '_No existing decisions match this asset yet. ADAMAS only assembles assets from decisions already in the ledger — add or confirm the relevant decisions and regenerate._\n'
    );
  }
  const body = asset.sections
    .map((s) => renderSection(s, decisionsBySection[s.key] ?? []))
    .join('\n\n---\n\n');
  return head + body + '\n';
}
