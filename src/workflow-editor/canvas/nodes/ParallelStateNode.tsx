import { Handle, type Node, type NodeProps, Position } from '@xyflow/react';
import { memo } from 'react';
import type { WorkflowStateDto } from '../../types';
import { PARALLEL_COLORS } from '../canvasTheme';

export type ParallelStateNodeType = Node<
  { state: WorkflowStateDto },
  'parallelState'
>;

export const ParallelStateNode = memo(
  ({ data, selected }: NodeProps<ParallelStateNodeType>) => {
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
        <Handle
          type="target"
          position={Position.Left}
          style={{ background: PARALLEL_COLORS.border }}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="branch-a"
          style={{ background: PARALLEL_COLORS.border, top: '35%' }}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="branch-b"
          style={{ background: PARALLEL_COLORS.border, top: '65%' }}
        />
      </div>
    );
  },
);
ParallelStateNode.displayName = 'ParallelStateNode';
