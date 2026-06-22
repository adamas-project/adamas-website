import path from 'node:path';
import { promises as fs } from 'node:fs';
import { DOMAINS, type Decision, type Domain } from '../schema/decision.schema.js';
import type { Ledger } from '../ledger/ledger.js';
import type { KnowledgeStore } from '../knowledge/store.js';
import type { AssetEngine } from '../assets/engine.js';
import { atomicWrite } from '../ledger/storage.js';
import { computeReadiness, type Readiness } from './readiness.js';

// Generates an Obsidian-native "data room" vault from the ADAMAS files. The
// ADAMAS vault stays the source of truth; this is a derived view, regenerated on
// demand, structured the way an M&A buyer's diligence checklist is organized.

const DOMAIN_FOLDER: Record<Domain, string> = {
  hiring: 'Hiring & People',
  sales: 'Sales & Revenue',
  product: 'Product & Delivery',
  finance: 'Finance',
  ops: 'Operations',
};

function fsSafe(s: string): string {
  return s.replace(/[\\/:*?"<>|#^[\]]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
}

function yamlScalar(v: unknown): string {
  return JSON.stringify(typeof v === 'string' ? v : String(v));
}

function frontmatter(obj: Record<string, unknown>): string {
  const lines: string[] = ['---'];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      if (v.length === 0) continue;
      lines.push(`${k}: [${v.map(yamlScalar).join(', ')}]`);
    } else {
      lines.push(`${k}: ${yamlScalar(v)}`);
    }
  }
  lines.push('---', '');
  return lines.join('\n');
}

function decisionNote(d: Decision): string {
  const owner = d.owner.name ? `${d.owner.role} (${d.owner.name})` : d.owner.role;
  const links = (d.links ?? []).map((l) => `[[${l}]]`);
  const fm = frontmatter({
    id: d.id,
    aliases: [d.id],
    type: 'decision',
    domain: d.domain,
    date: d.date,
    status: d.status ?? 'active',
    owner_role: d.owner.role,
    owner_name: d.owner.name,
    dissent: d.owner.dissent ?? [],
    superseded_by: d.superseded_by,
    sources: d.sources ?? [],
    tags: ['decision', d.domain, d.status ?? 'active'],
    links,
  });
  const body: string[] = [`# ${d.id} — ${d.title}`, ''];
  body.push(`**Decision.** ${d.decision}`, '');
  body.push(`**Why (context).** ${d.context}`, '');
  body.push(`**Owner.** ${owner} — **Dissent:** ${(d.owner.dissent ?? []).join(', ') || 'none recorded'}`, '');
  if (d.tradeoffs?.length) body.push('**Trade-offs.**', ...d.tradeoffs.map((t) => `- ${t}`), '');
  if (links.length) body.push(`**Linked decisions.** ${links.join(' · ')}`, '');
  if (d.superseded_by) body.push(`**Superseded by.** [[${d.superseded_by}]]`, '');
  if (d.sources?.length) body.push(`**Sources.** ${d.sources.join('; ')}`, '');
  return fm + body.join('\n') + '\n';
}

function knowledgeNote(e: {
  id: string;
  title: string;
  type: string;
  date: string;
  source: string;
  summary: string;
  takeaways?: string[];
  tags?: string[];
  author?: string;
}): string {
  const fm = frontmatter({
    id: e.id,
    aliases: [e.id],
    type: e.type,
    date: e.date,
    source: e.source,
    author: e.author,
    tags: ['knowledge', ...(e.tags ?? [])],
  });
  const body: string[] = [`# ${e.title}`, ''];
  if (e.source && e.source !== 'manual') body.push(`Source: ${e.source}`, '');
  body.push('## Summary', '', e.summary, '');
  if (e.takeaways?.length) body.push('## Key takeaways', '', ...e.takeaways.map((t) => `- ${t}`), '');
  return fm + body.join('\n') + '\n';
}

function readinessNote(r: Readiness): string {
  const rows = r.components.map((c) => `| ${c.label} | ${c.points} / ${c.max} |`).join('\n');
  const gaps = r.domainGaps.length ? r.domainGaps.map((d) => DOMAIN_FOLDER[d]).join(', ') : 'none';
  return [
    frontmatter({ type: 'readiness', tags: ['diligence', 'valuation'] }),
    '# Valuation Readiness',
    '',
    `> **Readiness score: ${r.score} / 100**`,
    '',
    `- Decisions on record: **${r.decisions}** · Knowledge entries: **${r.knowledge}**`,
    `- Traceability: **${r.traceabilityPct}%** of decisions cite their sources (${r.withSources}/${r.decisions})`,
    `- Dissent recorded on ${r.withDissent} decision(s); ${r.superseded} superseded/reversed (active management)`,
    `- Domain gaps: ${gaps}`,
    '',
    '| Component | Score |',
    '|---|---|',
    rows,
    '',
    '_Why this matters: in diligence, completeness + traceability + low key-person risk reduce perceived risk and support a higher valuation. ADAMAS keeps decisions immutable and sourced; Obsidian presents them as a navigable data room._',
    '',
  ].join('\n');
}

export interface ObsidianExportResult {
  path: string;
  decisions: number;
  knowledge: number;
  files: number;
  readiness: Readiness;
}

export async function buildObsidianVault(
  deps: { ledger: Ledger; knowledge: KnowledgeStore; assets: AssetEngine },
  outDir: string,
): Promise<ObsidianExportResult> {
  const { ledger, knowledge, assets } = deps;
  // Regenerate fresh (derived view).
  await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(outDir, { recursive: true });

  let files = 0;
  const write = async (rel: string, content: string) => {
    await atomicWrite(path.join(outDir, rel), content);
    files += 1;
  };

  const decisions = ledger.list();
  const readiness = computeReadiness(ledger, knowledge);

  // Decisions by domain + MOC.
  const decMoc: string[] = [frontmatter({ type: 'moc', tags: ['decisions'] }), '# Decisions', ''];
  for (const domain of DOMAINS) {
    const inDomain = decisions.filter((d) => d.domain === domain);
    decMoc.push(`## ${DOMAIN_FOLDER[domain]} (${inDomain.length})`);
    for (const d of inDomain) {
      await write(path.join('Decisions', DOMAIN_FOLDER[domain], `${d.id} — ${fsSafe(d.title)}.md`), decisionNote(d));
      decMoc.push(`- [[${d.id}]] — ${d.title}${(d.status ?? 'active') !== 'active' ? ` _(${d.status})_` : ''}`);
    }
    decMoc.push('');
  }
  await write(path.join('Decisions', 'Decisions MOC.md'), decMoc.join('\n'));

  // Knowledge + MOC.
  const knEntries = knowledge.list();
  const knMoc: string[] = [frontmatter({ type: 'moc', tags: ['knowledge'] }), '# Knowledge', ''];
  for (const e of knEntries) {
    await write(path.join('Knowledge', `${e.id} — ${fsSafe(e.title)}.md`), knowledgeNote(e));
    knMoc.push(`- [[${e.id}]] — ${e.title} _(${e.type})_`);
  }
  if (knEntries.length === 0) knMoc.push('_No knowledge entries yet._');
  await write(path.join('Knowledge', 'Knowledge MOC.md'), knMoc.join('\n'));

  // Diligence: the whole-ledger + risk assets, generated by the asset engine.
  const diligenceAssets = ['decision-diligence-binder', 'founder-continuity-dossier', 'risk-register', 'data-room-index'];
  const diMoc: string[] = [frontmatter({ type: 'moc', tags: ['diligence'] }), '# Diligence', ''];
  for (const id of diligenceAssets) {
    try {
      const asset = await assets.generate(id);
      const name = fsSafe(asset.title);
      await write(path.join('Diligence', `${name}.md`), `${frontmatter({ type: 'diligence', asset: id, tags: ['diligence'] })}${asset.markdown}`);
      diMoc.push(`- [[${name}]]`);
    } catch {
      /* asset not available */
    }
  }
  await write(path.join('Diligence', 'Diligence MOC.md'), diMoc.join('\n'));

  // Company / People — roles referenced as owners or dissenters across decisions.
  const roleMap = new Map<string, string[]>();
  for (const d of decisions) {
    for (const role of [d.owner.role, ...(d.owner.dissent ?? [])]) {
      (roleMap.get(role) ?? roleMap.set(role, []).get(role)!).push(d.id);
    }
  }
  const people = [frontmatter({ type: 'company', tags: ['company', 'people'] }), '# People & roles', ''];
  for (const [role, ids] of [...roleMap.entries()].sort()) {
    people.push(`- **${role}** — ${ids.map((i) => `[[${i}]]`).join(', ')}`);
  }
  if (roleMap.size === 0) people.push('_No roles recorded yet._');
  await write(path.join('Company', 'People.md'), people.join('\n'));

  // Readiness scorecard + top-level index/MOC (the cockpit).
  await write('Valuation Readiness.md', readinessNote(readiness));
  const index = [
    frontmatter({ type: 'moc', tags: ['index'] }),
    '# 🧭 ADAMAS Data Room',
    '',
    `Generated ${new Date().toISOString()} from the ADAMAS vault. Open this folder in Obsidian.`,
    '',
    `**[[Valuation Readiness]]** — score ${readiness.score}/100 · ${readiness.decisions} decisions · ${readiness.knowledge} knowledge entries`,
    '',
    '## Sections',
    '- [[Decisions MOC|Decisions]] — the governed, immutable decision ledger by department',
    '- [[Diligence MOC|Diligence]] — diligence binder, founder-continuity dossier, risk register, data-room index',
    '- [[Knowledge MOC|Knowledge]] — the living knowledge base',
    '- [[People|Company / People]] — roles referenced across decisions',
    '',
    '_This is a read-only view derived from ADAMAS. Edit decisions in ADAMAS (governed, append-only); use the Knowledge base for the living brain._',
    '',
  ].join('\n');
  await write('00 - Index.md', index);

  return { path: outDir, decisions: decisions.length, knowledge: knEntries.length, files, readiness };
}
