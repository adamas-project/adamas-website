import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type ReactElement } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { api, type Decision, type Domain } from '../api';
import { domainColor, token } from '../tokens';
import { DecisionDetail } from '../components/DecisionDetail';

const Graph3D = lazy(() => import('./Graph3D'));

export interface GNode {
  id: string;
  title: string;
  domain: Domain;
  status: string;
  degree: number;
  x?: number;
  y?: number;
}
export interface GLink {
  source: string | GNode;
  target: string | GNode;
  supersedes: boolean;
}

const DOMAINS: Domain[] = ['hiring', 'sales', 'product', 'finance', 'ops'];
const FG = ForceGraph2D as unknown as (props: Record<string, unknown>) => ReactElement;

function linkId(end: string | GNode): string {
  return typeof end === 'object' ? end.id : end;
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => setReduced(mq.matches);
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);
  return reduced;
}

export function GraphView() {
  const fgRef = useRef<any>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const [nodesAll, setNodesAll] = useState<GNode[]>([]);
  const [edges, setEdges] = useState<Array<{ source: string; target: string; supersedes: boolean }>>([]);
  const [dims, setDims] = useState({ w: 800, h: 620 });
  const [domainFilter, setDomainFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ decision: Decision; neighbors: string[] } | null>(null);
  const [pulses, setPulses] = useState(!reduced);
  const [mode, setMode] = useState<'2d' | '3d'>('2d');

  // Load graph; seed initial positions clustered by domain (brain-region feel).
  useEffect(() => {
    api.graph().then((g) => {
      const nodes: GNode[] = (g.nodes as GNode[]).map((n) => {
        const di = DOMAINS.indexOf(n.domain);
        const ang = (di / DOMAINS.length) * Math.PI * 2;
        const R = 200;
        return {
          ...n,
          x: Math.cos(ang) * R + (Math.random() - 0.5) * 140,
          y: Math.sin(ang) * R + (Math.random() - 0.5) * 140,
        };
      });
      setNodesAll(nodes);
      setEdges(g.edges.map((e: any) => ({ source: e.source, target: e.target, supersedes: e.supersedes })));
    });
  }, []);

  // Responsive canvas sizing.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setDims({ w: el.clientWidth, h: Math.max(440, Math.min(720, Math.round(window.innerHeight * 0.66))) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const statusOf = useMemo(() => new Map(nodesAll.map((n) => [n.id, n.status])), [nodesAll]);

  // Adjacency (id-based) for neighborhood highlighting.
  const adj = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const e of edges) {
      (m.get(e.source) ?? m.set(e.source, new Set()).get(e.source)!).add(e.target);
      (m.get(e.target) ?? m.set(e.target, new Set()).get(e.target)!).add(e.source);
    }
    return m;
  }, [edges]);

  const visible = useCallback(
    (n: GNode) => (!domainFilter || n.domain === domainFilter) && (!statusFilter || n.status === statusFilter),
    [domainFilter, statusFilter],
  );

  // Build graphData. Keep node object identity stable (positions persist); make
  // fresh link objects each time so the library's mutation never corrupts edges.
  const graphData = useMemo(() => {
    const nodes = nodesAll.filter(visible);
    const ok = new Set(nodes.map((n) => n.id));
    const links: GLink[] = edges
      .filter((e) => ok.has(e.source) && ok.has(e.target))
      .map((e) => ({ source: e.source, target: e.target, supersedes: e.supersedes }));
    return { nodes, links };
  }, [nodesAll, edges, visible]);

  // Tune forces so domains loosely cluster but stay connected.
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    fg.d3Force?.('charge')?.strength(-150);
    fg.d3Force?.('link')?.distance(70).strength(0.45);
  }, [graphData]);

  const heavy = nodesAll.length > 600;
  const accent = token('--accent', '#c9a84c');
  const textCol = token('--text', '#f5f5f7');

  const highlight = useMemo(() => {
    const focus = hoverId ?? selectedId;
    if (!focus) return null;
    const nodes = new Set<string>([focus, ...(adj.get(focus) ?? [])]);
    return { focus, nodes };
  }, [hoverId, selectedId, adj]);

  const openNode = useCallback(
    (id: string) => {
      setSelectedId(id);
      api.decision(id).then(setDetail).catch(() => setDetail(null));
      const fg = fgRef.current;
      const node = nodesAll.find((n) => n.id === id);
      if (fg && node && node.x != null && node.y != null) fg.centerAt?.(node.x, node.y, 600);
    },
    [nodesAll],
  );

  const drawNode = useCallback(
    (node: GNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const color = domainColor(node.domain);
      const isFocus = highlight?.focus === node.id;
      const inFocus = !highlight || highlight.nodes.has(node.id);
      const superseded = node.status !== 'active';
      const r = 4 + Math.min(11, node.degree * 1.7);
      const x = node.x ?? 0;
      const y = node.y ?? 0;

      ctx.save();
      ctx.globalAlpha = inFocus ? (superseded ? 0.65 : 1) : 0.12;

      if (!heavy && inFocus) {
        ctx.shadowColor = color;
        ctx.shadowBlur = isFocus ? 28 : 14;
      }
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.shadowBlur = 0;

      if (superseded) {
        ctx.globalAlpha = inFocus ? 0.9 : 0.2;
        ctx.setLineDash([2, 2]);
        ctx.lineWidth = 1;
        ctx.strokeStyle = color;
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (selectedId === node.id) {
        ctx.globalAlpha = 1;
        ctx.lineWidth = 2;
        ctx.strokeStyle = textCol;
        ctx.beginPath();
        ctx.arc(x, y, r + 3, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Labels only on hover/focus or when zoomed in (avoid clutter).
      if ((isFocus || globalScale > 2.2) && inFocus) {
        const label = node.id;
        ctx.globalAlpha = 1;
        ctx.font = `${Math.max(9, 11 / globalScale * 1.4)}px ui-monospace, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = textCol;
        ctx.fillText(label, x, y - r - 3);
      }
      ctx.restore();
    },
    [highlight, heavy, selectedId, textCol],
  );

  const nodePointerArea = useCallback((node: GNode, color: string, ctx: CanvasRenderingContext2D) => {
    const r = 4 + Math.min(11, node.degree * 1.7);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(node.x ?? 0, node.y ?? 0, r + 2, 0, Math.PI * 2);
    ctx.fill();
  }, []);

  const isLinkActive = useCallback(
    (l: GLink) => highlight && (linkId(l.source) === highlight.focus || linkId(l.target) === highlight.focus),
    [highlight],
  );

  if (mode === '3d') {
    return (
      <GraphChrome
        mode={mode}
        setMode={setMode}
        domainFilter={domainFilter}
        setDomainFilter={setDomainFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        pulses={pulses}
        setPulses={setPulses}
        reduced={reduced}
        detail={detail}
        onNavigate={openNode}
      >
        <div className="graph-wrap" ref={wrapRef} style={{ height: dims.h }}>
          <Suspense fallback={<div style={{ padding: 24 }} className="muted">Loading 3D view…</div>}>
            <Graph3D
              data={graphData}
              width={dims.w}
              height={dims.h}
              reduced={reduced}
              onNodeClick={(n: GNode) => openNode(n.id)}
            />
          </Suspense>
          <Legend />
        </div>
      </GraphChrome>
    );
  }

  return (
    <GraphChrome
      mode={mode}
      setMode={setMode}
      domainFilter={domainFilter}
      setDomainFilter={setDomainFilter}
      statusFilter={statusFilter}
      setStatusFilter={setStatusFilter}
      pulses={pulses}
      setPulses={setPulses}
      reduced={reduced}
      detail={detail}
      onNavigate={openNode}
    >
      <div className="graph-wrap" ref={wrapRef} style={{ height: dims.h }}>
        <FG
          ref={fgRef}
          graphData={graphData}
          width={dims.w}
          height={dims.h}
          backgroundColor="rgba(0,0,0,0)"
          nodeRelSize={5}
          nodeCanvasObject={drawNode as any}
          nodePointerAreaPaint={nodePointerArea as any}
          linkColor={((l: GLink) => (isLinkActive(l) ? accent : 'rgba(255,255,255,0.10)')) as any}
          linkWidth={((l: GLink) => (isLinkActive(l) ? 1.8 : 0.7)) as any}
          linkLineDash={((l: GLink) =>
            l.supersedes || statusOf.get(linkId(l.source)) !== 'active' || statusOf.get(linkId(l.target)) !== 'active'
              ? [3, 3]
              : null) as any}
          linkDirectionalParticles={((l: GLink) => {
            if (reduced || !pulses || heavy) return 0;
            if (isLinkActive(l)) return 2;
            const k = (linkId(l.source).charCodeAt(4) + linkId(l.target).charCodeAt(4)) % 6;
            return k === 0 ? 1 : 0;
          }) as any}
          linkDirectionalParticleWidth={2}
          linkDirectionalParticleColor={(() => accent) as any}
          linkDirectionalParticleSpeed={0.005}
          onNodeHover={((n: GNode | null) => setHoverId(n?.id ?? null)) as any}
          onNodeClick={((n: GNode) => openNode(n.id)) as any}
          onBackgroundClick={(() => setHoverId(null)) as any}
          cooldownTicks={reduced ? 0 : 200}
          warmupTicks={reduced ? 120 : 0}
          d3AlphaDecay={reduced ? 0.3 : 0.0150}
          d3VelocityDecay={0.32}
          onEngineStop={(() => fgRef.current?.zoomToFit?.(500, 48)) as any}
        />
        <Legend />
        <div className="graph-hint">hover: focus · click: open · scroll: zoom · drag: pan</div>
      </div>
    </GraphChrome>
  );
}

function Legend() {
  return (
    <div className="graph-legend" aria-hidden>
      {DOMAINS.map((d) => (
        <span key={d}>
          <span className="dot" style={{ color: `var(--domain-${d})`, background: `var(--domain-${d})` }} />
          {d}
        </span>
      ))}
      <span>· dashed = superseded/reversed</span>
    </div>
  );
}

function GraphChrome(props: {
  mode: '2d' | '3d';
  setMode: (m: '2d' | '3d') => void;
  domainFilter: string;
  setDomainFilter: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  pulses: boolean;
  setPulses: (v: boolean) => void;
  reduced: boolean;
  detail: { decision: Decision; neighbors: string[] } | null;
  onNavigate: (id: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="layout" style={{ gridTemplateColumns: '1fr 360px' }}>
      <div className="panel">
        <div className="toolbar">
          <h2 style={{ margin: 0, flex: 1 }}>Decision Graph</h2>
          <select value={props.domainFilter} onChange={(e) => props.setDomainFilter(e.target.value)} aria-label="Filter by domain">
            <option value="">all domains</option>
            {DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={props.statusFilter} onChange={(e) => props.setStatusFilter(e.target.value)} aria-label="Filter by status">
            <option value="">all statuses</option>
            <option value="active">active</option>
            <option value="superseded">superseded</option>
            <option value="reversed">reversed</option>
          </select>
          {!props.reduced && (
            <label className="rolebox" title="Animate synapse pulses along links">
              <input type="checkbox" checked={props.pulses} onChange={(e) => props.setPulses(e.target.checked)} /> pulses
            </label>
          )}
          <button className={props.mode === '3d' ? 'primary' : ''} onClick={() => props.setMode(props.mode === '2d' ? '3d' : '2d')}>
            {props.mode === '2d' ? '3D' : '2D'}
          </button>
        </div>
        {props.children}
      </div>

      <div className="panel">
        {props.detail ? (
          <DecisionDetail data={props.detail} onNavigate={props.onNavigate} />
        ) : (
          <p className="muted">Click a node to open its decision. Hover to highlight its neighborhood; heavily-linked decisions render as brighter hubs.</p>
        )}
      </div>
    </div>
  );
}
