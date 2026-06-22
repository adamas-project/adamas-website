import ForceGraph3D from 'react-force-graph-3d';
import type { ReactElement } from 'react';
import { token } from '../tokens';
import type { GNode, GLink } from './Graph';

// "Neural globe" view. Lazy-loaded so three.js stays out of the main bundle and
// only loads when the operator toggles 3D. Mirrors Obsidian's graph: a force-
// directed web in the ADAMAS colorway where dragging a node pulls its neighbors.
const FG3 = ForceGraph3D as unknown as (props: Record<string, unknown>) => ReactElement;

export default function Graph3D({
  data,
  width,
  height,
  reduced,
  nodeColor,
  onNodeClick,
}: {
  data: { nodes: GNode[]; links: GLink[] };
  width: number;
  height: number;
  reduced: boolean;
  nodeColor: (n: GNode) => string;
  onNodeClick: (n: GNode) => void;
}) {
  const accent = token('--accent', '#c9a84c');
  return (
    <FG3
      graphData={data}
      width={width}
      height={height}
      backgroundColor="rgba(0,0,0,0)"
      nodeColor={((n: GNode) => nodeColor(n)) as any}
      nodeVal={((n: GNode) => (n.kind === 'hub' ? 8 + n.degree * 0.5 : n.kind === 'tag' ? 0.6 : 1 + n.degree)) as any}
      nodeOpacity={0.92}
      nodeLabel={((n: GNode) => (n.kind === 'hub' || n.kind === 'tag' ? n.title : `${n.id} — ${n.title}`)) as any}
      linkColor={((l: GLink) => (l.kind === 'cross' ? 'rgba(227,201,119,0.5)' : 'rgba(201,168,76,0.32)')) as any}
      linkOpacity={0.5}
      linkWidth={((l: GLink) => (l.kind === 'hub' ? 0.6 : 0.4)) as any}
      linkDirectionalParticles={reduced ? 0 : 1}
      linkDirectionalParticleWidth={1.4}
      linkDirectionalParticleColor={(() => accent) as any}
      // Drag a node and the force engine pulls its neighbors along (Obsidian-like).
      enableNodeDrag
      onNodeClick={((n: GNode) => onNodeClick(n)) as any}
    />
  );
}
