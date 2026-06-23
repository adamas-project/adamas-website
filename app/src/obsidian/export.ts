import path from 'node:path';
import { promises as fs } from 'node:fs';
import { DOMAINS, type Decision, type Domain } from '../schema/decision.schema.js';
import type { Ledger } from '../ledger/ledger.js';
import type { KnowledgeStore } from '../knowledge/store.js';
import type { PeopleStore } from '../people/store.js';
import type { PersonEntry } from '../people/schema.js';
import type { RecordStore } from '../records/store.js';
import { RECORD_CATEGORIES, RECORD_CATEGORY_LABEL, type RecordEntry } from '../records/schema.js';
import type { AssetEngine } from '../assets/engine.js';
import { atomicWrite } from '../ledger/storage.js';
import { computeReadiness, type Readiness } from './readiness.js';
import { RESERVED_INBOX, ensureInbox } from './import.js';

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

function personNote(p: PersonEntry, ownedDecisions: string[]): string {
  const fm = frontmatter({
    id: p.id,
    aliases: [p.name],
    type: 'person',
    role: p.role,
    kind: p.kind,
    key_person: p.keyPerson ?? false,
    start_date: p.startDate,
    location: p.location,
    skills: p.skills ?? [],
    tags: ['person', p.kind, ...(p.keyPerson ? ['key-person'] : [])],
  });
  const body: string[] = [`# ${p.name}`, ''];
  body.push(`**${p.role}** · ${p.kind}${p.keyPerson ? ' · ⚠️ key person' : ''}`, '');
  body.push('## Bio', '', p.summary, '');
  if (p.highlights?.length) body.push('## Highlights', '', ...p.highlights.map((t) => `- ${t}`), '');
  if (p.skills?.length) body.push('## Skills', '', p.skills.join(', '), '');
  if (ownedDecisions.length) body.push('## Decisions owned', '', ...ownedDecisions.map((id) => `- [[${id}]]`), '');
  return fm + body.join('\n') + '\n';
}

function recordNote(r: RecordEntry): string {
  const fm = frontmatter({
    id: r.id,
    aliases: [r.id],
    type: 'record',
    category: r.category,
    status: r.status,
    owner: r.owner,
    amount: r.amount,
    currency: r.currency,
    recurring: r.recurring,
    metric: r.metric,
    period: r.period,
    severity: r.severity,
    due_date: r.dueDate,
    source: r.source,
    tags: ['record', r.category, ...(r.tags ?? [])],
  });
  const facts: string[] = [];
  if (r.owner) facts.push(`**Owner:** ${r.owner}`);
  if (r.status) facts.push(`**Status:** ${r.status}`);
  if (r.amount != null) facts.push(`**Value:** ${r.currency ?? ''}${r.amount.toLocaleString()}${r.recurring ? '/yr (recurring)' : ''}`);
  if (r.metric) facts.push(`**Metric:** ${r.metric}${r.period ? ` (${r.period})` : ''}`);
  if (r.severity) facts.push(`**Severity:** ${r.severity}`);
  if (r.dueDate) facts.push(`**Due/renewal:** ${r.dueDate}`);
  const body: string[] = [`# ${r.title}`, '', `_${RECORD_CATEGORY_LABEL[r.category]}_`, ''];
  if (facts.length) body.push(facts.join(' · '), '');
  body.push(r.summary, '');
  if (r.mitigation) body.push(`**Mitigation.** ${r.mitigation}`, '');
  if (r.source) body.push(`**Source.** ${r.source}`, '');
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
    `- Team: **${r.people}** documented · ${r.peopleWithCv} with CVs · ${r.keyPeople} flagged key-person`,
    `- Diligence records: **${r.records}** across ${r.recordCategories}/4 categories (customers, financials, risk, IP)`,
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
  deps: { ledger: Ledger; knowledge: KnowledgeStore; assets: AssetEngine; people?: PeopleStore; records?: RecordStore },
  outDir: string,
): Promise<ObsidianExportResult> {
  const { ledger, knowledge, assets, people, records } = deps;
  // Regenerate fresh (derived view). Clear the folder's *contents* rather than
  // removing the folder itself: in Docker the output dir is a bind-mount, and
  // rmdir on a mount point fails with EBUSY. Removing children avoids that.
  // Preserve reserved entries: Obsidian's own settings (.obsidian) and the
  // user's write-back inbox (_Inbox) — never clobber what the operator owns.
  await fs.mkdir(outDir, { recursive: true });
  for (const entry of await fs.readdir(outDir)) {
    if (entry === '.obsidian' || entry === RESERVED_INBOX) continue;
    await fs.rm(path.join(outDir, entry), { recursive: true, force: true });
  }
  await ensureInbox(outDir);

  let files = 0;
  const write = async (rel: string, content: string) => {
    await atomicWrite(path.join(outDir, rel), content);
    files += 1;
  };

  const decisions = ledger.list();
  const readiness = computeReadiness(ledger, knowledge, people, records);

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

  // Company / People — team-member profiles (CVs) + the role map from decisions.
  const roleMap = new Map<string, string[]>();
  for (const d of decisions) {
    for (const role of [d.owner.role, ...(d.owner.dissent ?? [])]) {
      (roleMap.get(role) ?? roleMap.set(role, []).get(role)!).push(d.id);
    }
  }
  const peopleList = people?.list() ?? [];
  // Decisions a person owns: match their name or role against decision owners.
  const decisionsFor = (p: PersonEntry): string[] => {
    const role = p.role.toLowerCase();
    return decisions
      .filter((d) => d.owner.name?.toLowerCase() === p.name.toLowerCase() || d.owner.role.toLowerCase() === role)
      .map((d) => d.id);
  };
  for (const p of peopleList) {
    await write(path.join('Company', 'People', `${fsSafe(p.name)}.md`), personNote(p, decisionsFor(p)));
  }

  const companyDoc = [frontmatter({ type: 'company', tags: ['company', 'people'] }), '# Company — People', ''];
  if (peopleList.length) {
    companyDoc.push('## Team', '');
    for (const p of peopleList) {
      companyDoc.push(`- [[${fsSafe(p.name)}|${p.name}]] — ${p.role} _(${p.kind}${p.keyPerson ? ', key person' : ''})_`);
    }
    companyDoc.push('');
  }
  companyDoc.push('## Roles referenced in decisions', '');
  for (const [role, ids] of [...roleMap.entries()].sort()) {
    companyDoc.push(`- **${role}** — ${ids.map((i) => `[[${i}]]`).join(', ')}`);
  }
  if (roleMap.size === 0) companyDoc.push('_No roles recorded yet._');
  await write(path.join('Company', 'People.md'), companyDoc.join('\n'));

  // Data room: commercial / financial / risk / IP records, grouped by category.
  const recordList = records?.list() ?? [];
  const recMoc: string[] = [frontmatter({ type: 'moc', tags: ['dataroom'] }), '# Data Room records', ''];
  for (const category of RECORD_CATEGORIES) {
    const inCat = recordList.filter((r) => r.category === category);
    recMoc.push(`## ${RECORD_CATEGORY_LABEL[category]} (${inCat.length})`);
    for (const r of inCat) {
      await write(path.join('Data Room', RECORD_CATEGORY_LABEL[category], `${r.id} — ${fsSafe(r.title)}.md`), recordNote(r));
      recMoc.push(`- [[${r.id}]] — ${r.title}${r.status ? ` _(${r.status})_` : ''}`);
    }
    recMoc.push('');
  }
  await write(path.join('Data Room', 'Data Room MOC.md'), recMoc.join('\n'));

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
    '- [[Data Room MOC|Data Room records]] — customers, financials, risk, IP & assets',
    '- [[Knowledge MOC|Knowledge]] — the living knowledge base',
    '- [[People|Company / People]] — team profiles (CVs) + roles across decisions',
    '',
    '_This is a read-only view derived from ADAMAS. Edit decisions in ADAMAS (governed, append-only); use the Knowledge base for the living brain._',
    '',
  ].join('\n');
  await write('00 - Index.md', index);

  return { path: outDir, decisions: decisions.length, knowledge: knEntries.length, files, readiness };
}
