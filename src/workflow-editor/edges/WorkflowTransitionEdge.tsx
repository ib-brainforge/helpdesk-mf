import {
  BaseEdge,
  type Edge,
  EdgeLabelRenderer,
  type EdgeProps,
  getBezierPath,
} from '@xyflow/react';
import { CANVAS_TOKENS } from '../canvas/canvasTheme';
import type { WorkflowTransitionDto } from '../types';
import { TriggerType } from '../types/enums';

export type WorkflowTransitionEdgeType = Edge<
  { transition: WorkflowTransitionDto },
  'workflowTransition'
>;

const TRIGGER_LABEL: Record<TriggerType, string> = {
  [TriggerType.Manual]: 'Manual',
  [TriggerType.Event]: 'Event',
  [TriggerType.Timer]: 'Timer',
};

export function WorkflowTransitionEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<WorkflowTransitionEdgeType>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const t = data?.transition;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: selected ? CANVAS_TOKENS.edgeSelected : CANVAS_TOKENS.edge,
          strokeWidth: 2,
        }}
      />
      {t && (
        <EdgeLabelRenderer>
          <div
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
            className="absolute bg-white rounded px-2 py-1 text-xs border border-gray-200 shadow-sm pointer-events-auto"
          >
            <span className="font-medium text-gray-700">
              {TRIGGER_LABEL[t.triggerType]}
            </span>
            {t.guardExpression && (
              <span
                className="ml-1 text-amber-600"
                title={`Guard: ${t.guardExpression}`}
              >
                ⚠ guard
              </span>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
