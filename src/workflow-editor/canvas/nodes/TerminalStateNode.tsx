import { Handle, type Node, type NodeProps, Position } from '@xyflow/react';
import { memo } from 'react';
import type { WorkflowStateDto } from '../../types';
import { CATEGORY_COLORS } from '../canvasTheme';

export type TerminalStateNodeType = Node<
  { state: WorkflowStateDto },
  'terminalState'
>;

export const TerminalStateNode = memo(
  ({ data, selected }: NodeProps<TerminalStateNodeType>) => {
    const c = CATEGORY_COLORS[data.state.category];
    return (
      <div
        style={{
          background: c.bg,
          borderColor: c.border,
          color: c.text,
          borderWidth: selected ? 4 : 3,
          borderStyle: 'double',
        }}
        className="rounded-full px-5 py-3 min-w-[140px] shadow-sm flex items-center gap-2"
      >
        {/* Terminal end circle indicator */}
        <div
          style={{ background: c.border }}
          className="w-3 h-3 rounded-full flex-shrink-0"
          aria-hidden="true"
        />
        <div className="text-sm font-semibold">{data.state.name}</div>
        <Handle
          type="target"
          position={Position.Left}
          style={{ background: c.border }}
        />
      </div>
    );
  },
);
TerminalStateNode.displayName = 'TerminalStateNode';
