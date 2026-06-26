import type { Ledger } from './ledger.js';
import type { KnowledgeStore } from '../knowledge/store.js';
import type { PeopleStore } from '../people/store.js';
import type { RecordStore } from '../records/store.js';
import { RECORD_CATEGORY_LABEL } from '../records/schema.js';
import type { Domain, Status } from '../schema/decision.schema.js';

const DOMAIN_LABEL: Record<Domain, string> = {
  hiring: 'Hiring & People',
  sales: 'Sales & Revenue',
  product: 'Product & Delivery',
  finance: 'Finance',
  ops: 'Operations',
};

export interface GraphNode {
  id: string;
  title: string;
  domain: Domain;
  status: Status;
  degree: number;
}

export interface GraphEdge {
  /** Undirected edge, normalized so source < target lexicographically. */
  source: string;
  target: string;
  /** True when the pair is a supersede/reverse relationship. */
  supersedes: boolean;
}

export interface DecisionGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * Build an undirected graph from the ledger's bi-directional links. Because
 * links are symmetric, each edge is emitted once (normalized + de-duplicated).
 */
export function buildGraph(ledger: Ledger): DecisionGraph {
  const decisions = ledger.list();
  const degree = new Map<string, number>();
  const edgeSet = new Map<string, GraphEdge>();

  for (const d of decisions) {
    for (const target of d.links ?? []) {
      if (!ledger.has(target)) continue; // skip dangling (should not occur)
      const [a, b] = d.id < target ? [d.id, target] : [target, d.id];
      const key = `${a}__${b}`;
      if (!edgeSet.has(key)) {
        const supersedes =
          ledger.get(a)?.superseded_by === b || ledger.get(b)?.superseded_by === a;
        edgeSet.set(key, { source: a, target: b, supersedes });
      }
      degree.set(d.id, (degree.get(d.id) ?? 0) + 1);
    }
  }

  const nodes: GraphNode[] = decisions.map((d) => ({
    id: d.id,
    title: d.title,
    domain: d.domain,
    status: d.status ?? 'active',
    degree: degree.get(d.id) ?? 0,
  }));

  return { nodes, edges: [...edgeSet.values()].sort((x, y) => x.source.localeCompare(y.source)) };
}

// --- Memory graph: decisions + knowledge, structured like an Obsidian vault ---

export type MemoryNodeKind = 'decision' | 'knowledge' | 'hub' | 'tag' | 'person' | 'record';

export interface MemoryNode {
  id: string;
  title: string;
  kind: MemoryNodeKind;
  /** Cluster key: a domain for decisions, "knowledge", or "hub". */
  group: string;
  domain?: Domain;
  status: Status;
  degree: number;
}

export interface MemoryEdge {
  source: string;
  target: string;
  /** "link" = decision↔decision, "hub" = MOC membership, "cross" = topic link. */
  kind: 'link' | 'hub' | 'cross';
  supersedes: boolean;
}

export interface MemoryGraph {
  nodes: MemoryNode[];
  edges: MemoryEdge[];
}

const STOPISH = new Set(
  'the and for with from that this your you our are was were will would into over under more most than other ' +
    'about which when where what who why how not but all any can could should may might must per via etc'.split(/\s+/),
);

/** Significant lowercase terms (tags + title words, length ≥ 4) for matching. */
function knowledgeTerms(tags: string[] | undefined, title: string): string[] {
  const fromTags = (tags ?? []).map((t) => t.toLowerCase().replace(/-/g, ' ').trim());
  const fromTitle = title.toLowerCase().match(/[a-z][a-z0-9+#-]{3,}/g) ?? [];
  const all = [...fromTags.flatMap((t) => t.split(/\s+/)), ...fromTitle];
  return [...new Set(all)].filter((w) => w.length >= 4 && !STOPISH.has(w));
}

/**
 * Build a combined "second brain" graph from decisions + knowledge, structured
 * the way the Obsidian vault is: department/topic clusters hanging off MOC hubs,
 * decision↔decision bi-links, and topic cross-links from knowledge to the
 * decisions (and other notes) it relates to. Mirrors the Obsidian graph so the
 * in-app 3D view reads the same.
 */
export function buildMemoryGraph(
  ledger: Ledger,
  knowledge?: KnowledgeStore,
  opts: { topics?: boolean; people?: PeopleStore; records?: RecordStore; limit?: number } = {},
): MemoryGraph {
  const decisions = ledger.list();
  const knEntries = knowledge?.list() ?? [];
  const peopleEntries = opts.people?.list() ?? [];
  const recordEntries = opts.records?.list() ?? [];
  const degree = new Map<string, number>();
  const bump = (id: string) => degree.set(id, (degree.get(id) ?? 0) + 1);
  const edges: MemoryEdge[] = [];
  const seen = new Set<string>();
  const addEdge = (a: string, b: string, kind: MemoryEdge['kind'], supersedes = false) => {
    if (a === b) return;
    const [s, t] = a < b ? [a, b] : [b, a];
    const key = `${s}__${t}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push({ source: s, target: t, kind, supersedes });
    bump(s);
    bump(t);
  };

  const DEC_HUB = '#decisions';
  const KN_HUB = '#knowledge';
  const PPL_HUB = '#people';
  const DR_HUB = '#dataroom';
  const normRole = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '-');

  // Decisions → department sub-hubs → decisions, plus decision↔decision bi-links.
  const domainsPresent = new Set(decisions.map((d) => d.domain));
  for (const dom of domainsPresent) addEdge(DEC_HUB, `#dom:${dom}`, 'hub');
  for (const d of decisions) {
    addEdge(`#dom:${d.domain}`, d.id, 'hub');
    for (const target of d.links ?? []) {
      if (!ledger.has(target)) continue;
      const supersedes = d.superseded_by === target || ledger.get(target)?.superseded_by === d.id;
      addEdge(d.id, target, 'link', supersedes);
    }
  }

  // Knowledge→hub membership.
  for (const e of knEntries) if (knowledge) addEdge(KN_HUB, e.id, 'hub');

  // People → hub, and each person → the decisions they own (name or role match).
  for (const p of peopleEntries) {
    addEdge(PPL_HUB, p.id, 'hub');
    for (const d of decisions) {
      const owns = d.owner.name?.toLowerCase() === p.name.toLowerCase() || normRole(d.owner.role) === normRole(p.role);
      if (owns) addEdge(p.id, d.id, 'cross');
    }
  }

  // Data-room records → category sub-hubs → records.
  const catsPresent = new Set(recordEntries.map((r) => r.category));
  for (const cat of catsPresent) addEdge(DR_HUB, `#rec:${cat}`, 'hub');
  for (const r of recordEntries) addEdge(`#rec:${r.category}`, r.id, 'hub');

  const decHaystacks = decisions.map((d) => ({
    id: d.id,
    text: `${d.title} ${d.context} ${d.decision} ${(d.tradeoffs ?? []).join(' ')} ${d.domain}`.toLowerCase(),
  }));

  // Tag node ids created in topics mode (so we can emit them as nodes later).
  const tagNodes = new Map<string, string>(); // tag -> node id

  if (opts.topics) {
    // Topics view: shared themes become their own nodes (like Obsidian tags),
    // linking the knowledge and decisions that share them.
    const byTag = new Map<string, { kn: string[]; dec: Set<string> }>();
    for (const e of knEntries) {
      for (const tag of e.tags ?? []) {
        const key = tag.toLowerCase().trim();
        if (!key) continue;
        const bucket = byTag.get(key) ?? byTag.set(key, { kn: [], dec: new Set() }).get(key)!;
        bucket.kn.push(e.id);
        const terms = key.split(/[\s-]+/).filter((w) => w.length >= 4);
        for (const h of decHaystacks) {
          if (terms.some((t) => h.text.includes(t))) bucket.dec.add(h.id);
        }
      }
    }
    for (const [tag, b] of byTag) {
      if (b.kn.length + b.dec.size < 2) continue; // skip singletons
      const tagId = `#tag:${tag}`;
      tagNodes.set(tag, tagId);
      for (const knId of b.kn) addEdge(tagId, knId, 'cross');
      for (const decId of [...b.dec].slice(0, 6)) addEdge(tagId, decId, 'cross');
    }
  } else {
    // Default view: direct topic cross-links (knowledge→decision, knowledge↔knowledge).
    for (const e of knEntries) {
      const terms = knowledgeTerms(e.tags, e.title);
      if (!terms.length) continue;
      const scored = decHaystacks
        .map((h) => ({ id: h.id, score: terms.reduce((n, t) => n + (h.text.includes(t) ? 1 : 0), 0) }))
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 4);
      for (const s of scored) addEdge(e.id, s.id, 'cross');
    }
    for (let i = 0; i < knEntries.length; i++) {
      const a = knEntries[i]!;
      const aTags = new Set((a.tags ?? []).map((t) => t.toLowerCase()));
      let made = 0;
      for (let j = i + 1; j < knEntries.length && made < 3; j++) {
        const b = knEntries[j]!;
        if ((b.tags ?? []).some((t) => aTags.has(t.toLowerCase()))) {
          addEdge(a.id, b.id, 'cross');
          made++;
        }
      }
    }
  }

  // One connected core: link the top-level MOC hubs together (like 00 - Index).
  if (knEntries.length) addEdge(DEC_HUB, KN_HUB, 'hub');
  if (peopleEntries.length) addEdge(DEC_HUB, PPL_HUB, 'hub');
  if (recordEntries.length) addEdge(DEC_HUB, DR_HUB, 'hub');

  const hub = (id: string, title: string, group = 'hub'): MemoryNode => ({
    id,
    title,
    kind: 'hub',
    group,
    status: 'active',
    degree: degree.get(id) ?? 0,
  });

  const nodes: MemoryNode[] = [
    hub(DEC_HUB, 'Decisions'),
    ...(knEntries.length ? [hub(KN_HUB, 'Knowledge')] : []),
    ...(peopleEntries.length ? [hub(PPL_HUB, 'Company / People')] : []),
    ...(recordEntries.length ? [hub(DR_HUB, 'Data Room')] : []),
    // Department sub-hubs (cluster with their decisions).
    ...[...domainsPresent].map((dom) => hub(`#dom:${dom}`, DOMAIN_LABEL[dom], dom)),
    // Data-room category sub-hubs.
    ...[...catsPresent].map((cat) => hub(`#rec:${cat}`, RECORD_CATEGORY_LABEL[cat], 'dataroom')),
    ...decisions.map((d): MemoryNode => ({
      id: d.id,
      title: d.title,
      kind: 'decision',
      group: d.domain,
      domain: d.domain,
      status: d.status ?? 'active',
      degree: degree.get(d.id) ?? 0,
    })),
    ...knEntries.map((e): MemoryNode => ({
      id: e.id,
      title: e.title,
      kind: 'knowledge',
      group: 'knowledge',
      status: 'active',
      degree: degree.get(e.id) ?? 0,
    })),
    ...peopleEntries.map((p): MemoryNode => ({
      id: p.id,
      title: p.name,
      kind: 'person',
      group: 'people',
      status: 'active',
      degree: degree.get(p.id) ?? 0,
    })),
    ...recordEntries.map((r): MemoryNode => ({
      id: r.id,
      title: r.title,
      kind: 'record',
      group: 'dataroom',
      status: 'active',
      degree: degree.get(r.id) ?? 0,
    })),
    ...[...tagNodes.entries()].map(([tag, id]): MemoryNode => ({
      id,
      title: `#${tag}`,
      kind: 'tag',
      group: 'topic',
      status: 'active',
      degree: degree.get(id) ?? 0,
    })),
  ];

  // Cap for rendering: a force-directed 3D view bogs down past a few hundred
  // nodes. Keep all structural nodes (hubs + topic tags) plus the most-connected
  // leaves up to `limit`, then drop edges to pruned nodes. The full vault is
  // unchanged — this only bounds what the graph view has to draw.
  if (opts.limit && opts.limit > 0 && nodes.length > opts.limit) {
    const structural = nodes.filter((n) => n.kind === 'hub' || n.kind === 'tag');
    const leaves = nodes
      .filter((n) => n.kind !== 'hub' && n.kind !== 'tag')
      .sort((a, b) => b.degree - a.degree);
    const room = Math.max(0, opts.limit - structural.length);
    const kept = [...structural, ...leaves.slice(0, room)];
    const keepIds = new Set(kept.map((n) => n.id));
    return { nodes: kept, edges: edges.filter((e) => keepIds.has(e.source) && keepIds.has(e.target)) };
  }

  return { nodes, edges };
}

/** Direct neighbours of a decision (for link-navigation). */
export function neighbors(ledger: Ledger, id: string): string[] {
  const d = ledger.get(id);
  if (!d) return [];
  return (d.links ?? []).filter((l) => ledger.has(l)).sort();
}
