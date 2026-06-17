import { useEffect, useMemo, useState } from 'react';
import { api, type Domain } from '../api';
import { domainColor } from '../tokens';

interface GNode { id: string; title: string; domain: Domain; status: string; degree: number; }
interface GEdge { source: string; target: string; supersedes: boolean; }

const DOMAINS: Domain[] = ['hiring', 'sales', 'product', 'finance', 'ops'];
const W = 1100;
const COL = W / DOMAINS.length;
const ROW = 90;
const PAD = 60;

export function GraphView() {
  const [nodes, setNodes] = useState<GNode[]>([]);
  const [edges, setEdges] = useState<GEdge[]>([]);
  const [sel, setSel] = useState<string | null>(null);

  useEffect(() => {
    api.graph().then((g) => {
      setNodes(g.nodes);
      setEdges(g.edges);
    });
  }, []);

  const pos = useMemo(() => {
    const byDomain: Record<string, GNode[]> = {};
    for (const n of nodes) (byDomain[n.domain] ??= []).push(n);
    const map = new Map<string, { x: number; y: number }>();
    DOMAINS.forEach((d, di) => {
      (byDomain[d] ?? []).forEach((n, i) => {
        map.set(n.id, { x: di * COL + COL / 2, y: PAD + i * ROW });
      });
    });
    return map;
  }, [nodes]);

  const height = useMemo(() => {
    const maxPer = Math.max(1, ...DOMAINS.map((d) => nodes.filter((n) => n.domain === d).length));
    return PAD * 2 + (maxPer - 1) * ROW;
  }, [nodes]);

  const neighborSet = useMemo(() => {
    if (!sel) return new Set<string>();
    const s = new Set<string>();
    for (const e of edges) {
      if (e.source === sel) s.add(e.target);
      if (e.target === sel) s.add(e.source);
    }
    return s;
  }, [sel, edges]);

  return (
    <div className="panel">
      <h2>Decision Graph</h2>
      <p className="muted">
        Bi-directional links between decisions, grouped by domain. Click a node to highlight its connections.
        {sel ? <> Selected: <strong>{sel}</strong> — {neighborSet.size} link(s).</> : null}
      </p>
      <div style={{ overflow: 'auto', border: '1px solid var(--border-2)', borderRadius: 8, background: 'var(--bg)' }}>
        <svg viewBox={`0 0 ${W} ${height}`} width="100%" style={{ minWidth: 760, display: 'block' }} role="img" aria-label="Decision graph">
          {DOMAINS.map((d, di) => (
            <text key={d} x={di * COL + COL / 2} y={26} textAnchor="middle" fill={domainColor(d)} fontSize={14} fontWeight={700}>
              {d}
            </text>
          ))}
          {edges.map((e, i) => {
            const a = pos.get(e.source);
            const b = pos.get(e.target);
            if (!a || !b) return null;
            const active = sel && (e.source === sel || e.target === sel);
            return (
              <line
                key={i}
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={active ? 'var(--accent)' : 'var(--border)'}
                strokeWidth={active ? 2.5 : 1}
                strokeDasharray={e.supersedes ? '5 4' : undefined}
                opacity={sel && !active ? 0.25 : 0.9}
              />
            );
          })}
          {nodes.map((n) => {
            const p = pos.get(n.id);
            if (!p) return null;
            const isSel = sel === n.id;
            const isNeighbor = neighborSet.has(n.id);
            const dim = sel && !isSel && !isNeighbor;
            return (
              <g key={n.id} transform={`translate(${p.x},${p.y})`} style={{ cursor: 'pointer' }} onClick={() => setSel(isSel ? null : n.id)} opacity={dim ? 0.35 : 1}>
                <circle r={10 + Math.min(8, n.degree * 1.5)} fill={domainColor(n.domain)} stroke={isSel ? 'var(--text)' : 'var(--bg)'} strokeWidth={isSel ? 3 : 1.5} />
                <text x={0} y={-18} textAnchor="middle" fill="var(--text)" fontSize={11} fontFamily="monospace">{n.id}</text>
                <title>{`${n.id} — ${n.title} (${n.status})`}</title>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
