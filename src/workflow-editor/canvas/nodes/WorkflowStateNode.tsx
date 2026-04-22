import { Handle, type Node, type NodeProps, Position } from '@xyflow/react';
import { memo } from 'react';
import type { WorkflowStateDto } from '../../types';
import { CATEGORY_COLORS } from '../canvasTheme';

export type WorkflowStateNodeType = Node<
  { state: WorkflowStateDto },
  'workflowState'
>;

export const WorkflowStateNode = memo(
  ({ data, selected }: NodeProps<WorkflowStateNodeType>) => {
    const c = CATEGORY_COLORS[data.state.category];
    return (
      <div
        style={{
          background: c.bg,
          borderColor: c.border,
          color: c.text,
          borderWidth: selected ? 3 : 2,
          borderStyle: 'solid',
        }}
        className="rounded-md px-4 py-3 min-w-[160px] shadow-sm"
      >
        <div className="text-xs uppercase tracking-wide opacity-70 mb-1">
          {c.label}
        </div>
        <div className="text-sm font-semibold">{data.state.name}</div>
        <Handle
          type="target"
          position={Position.Left}
          style={{ background: c.border }}
        />
        <Handle
          type="source"
          position={Position.Right}
          style={{ background: c.border }}
        />
      </div>
    );
  },
);
WorkflowStateNode.displayName = 'WorkflowStateNode';
