import type { Ledger } from './ledger.js';
import type { Domain, Status } from '../schema/decision.schema.js';

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

/** Direct neighbours of a decision (for link-navigation). */
export function neighbors(ledger: Ledger, id: string): string[] {
  const d = ledger.get(id);
  if (!d) return [];
  return (d.links ?? []).filter((l) => ledger.has(l)).sort();
}
