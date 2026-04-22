import { Handle, type Node, type NodeProps, Position } from '@xyflow/react';
import { memo } from 'react';
import type { WorkflowStateDto } from '../../types';
import { PARALLEL_COLORS } from '../canvasTheme';

export type ParallelStateNodeType = Node<
  { state: WorkflowStateDto },
  'parallelState'
>;

/** Minimum number of branch handles to render for visual stability */
const MIN_HANDLES = 2;

export const ParallelStateNode = memo(
  ({ data, selected }: NodeProps<ParallelStateNodeType>) => {
    const branchCount = Math.max(
      data.state.parallelSpec?.branchStartStateIds.length ?? 0,
      MIN_HANDLES,
    );

    // Distribute handles evenly along the right side.
    // topPct returns a percentage string placing the i-th handle of n total.
    function topPct(i: number, total: number): string {
      // Spread across 20%–80% of the node height to avoid overlapping corners.
      const step = 60 / (total + 1);
      return `${20 + step * (i + 1)}%`;
    }

    return (
      <div
        style={{
          background: PARALLEL_COLORS.bg,
          borderColor: PARALLEL_COLORS.border,
          color: PARALLEL_COLORS.text,
          borderWidth: selected ? 3 : 2,
          borderStyle: 'dashed',
        }}
        className="rounded-md px-4 py-3 min-w-[160px] shadow-sm"
      >
        {/* Fork/join indicator bar */}
        <div className="flex items-center gap-2 mb-1">
          <div
            className="flex flex-col gap-0.5 flex-shrink-0"
            aria-hidden="true"
          >
            <div className="w-5 h-0.5 bg-purple-600" />
            <div className="w-5 h-0.5 bg-purple-600" />
            <div className="w-5 h-0.5 bg-purple-600" />
          </div>
          <span className="text-xs uppercase tracking-wide opacity-70">
            {PARALLEL_COLORS.label}
          </span>
        </div>
        <div className="text-sm font-semibold">{data.state.name}</div>

        {/* Single incoming handle on the left */}
        <Handle
          type="target"
          position={Position.Left}
          style={{ background: PARALLEL_COLORS.border }}
        />

        {/* One outgoing handle per branch, dynamically positioned on the right */}
        {Array.from({ length: branchCount }, (_, i) => (
          <Handle
            key={`branch-${i}`}
            type="source"
            position={Position.Right}
            id={`branch-${i}`}
            style={{
              background: PARALLEL_COLORS.border,
              top: topPct(i, branchCount),
            }}
          />
        ))}
      </div>
    );
  },
);
ParallelStateNode.displayName = 'ParallelStateNode';
