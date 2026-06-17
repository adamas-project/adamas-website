import ForceGraph3D from 'react-force-graph-3d';
import type { ReactElement } from 'react';
import { domainColor } from '../tokens';
import type { GNode, GLink } from './Graph';

// Optional literal "neural globe" view. Lazy-loaded so three.js stays out of the
// main bundle and only loads when the operator toggles 3D.
const FG3 = ForceGraph3D as unknown as (props: Record<string, unknown>) => ReactElement;

export default function Graph3D({
  data,
  width,
  height,
  reduced,
  onNodeClick,
}: {
  data: { nodes: GNode[]; links: GLink[] };
  width: number;
  height: number;
  reduced: boolean;
  onNodeClick: (n: GNode) => void;
}) {
  return (
    <FG3
      graphData={data}
      width={width}
      height={height}
      backgroundColor="rgba(0,0,0,0)"
      nodeColor={((n: GNode) => domainColor(n.domain)) as any}
      nodeVal={((n: GNode) => 1 + n.degree) as any}
      nodeOpacity={0.9}
      nodeLabel={((n: GNode) => `${n.id} — ${n.title}`) as any}
      linkColor={(() => 'rgba(201,168,76,0.35)') as any}
      linkOpacity={0.45}
      linkWidth={0.4}
      linkDirectionalParticles={reduced ? 0 : 1}
      linkDirectionalParticleWidth={1.4}
      enableNodeDrag={false}
      onNodeClick={((n: GNode) => onNodeClick(n)) as any}
    />
  );
}
