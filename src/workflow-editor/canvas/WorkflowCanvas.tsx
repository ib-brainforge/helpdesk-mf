import {
  Background,
  BackgroundVariant,
  type Connection,
  Controls,
  type Edge,
  type EdgeChange,
  MarkerType,
  MiniMap,
  type Node,
  type NodeChange,
  ReactFlow,
  ReactFlowProvider,
  applyEdgeChanges,
  applyNodeChanges,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCallback, useMemo } from 'react';
import {
  WorkflowTransitionEdge,
  type WorkflowTransitionEdgeType,
} from '../edges/WorkflowTransitionEdge';
import type { WorkflowStateDto, WorkflowTransitionDto } from '../types';
import { StateType, TriggerType } from '../types/enums';
import { CANVAS_TOKENS } from './canvasTheme';
import {
  ParallelStateNode,
  type ParallelStateNodeType,
} from './nodes/ParallelStateNode';
import {
  TerminalStateNode,
  type TerminalStateNodeType,
} from './nodes/TerminalStateNode';
import {
  WorkflowStateNode,
  type WorkflowStateNodeType,
} from './nodes/WorkflowStateNode';

export interface WorkflowCanvasProps {
  states: WorkflowStateDto[];
  transitions: WorkflowTransitionDto[];
  onChange: (
    states: WorkflowStateDto[],
    transitions: WorkflowTransitionDto[],
  ) => void;
  onSelectState?: (stateId: string | null) => void;
  onSelectTransition?: (transitionId: string | null) => void;
  readOnly?: boolean;
}

const NODE_TYPES = {
  workflowState: WorkflowStateNode,
  terminalState: TerminalStateNode,
  parallelState: ParallelStateNode,
};

const EDGE_TYPES = {
  workflowTransition: WorkflowTransitionEdge,
};

/** Map a StateType to a node type key */
function nodeTypeForState(s: WorkflowStateDto): string {
  if (s.type === StateType.Terminal) return 'terminalState';
  if (s.type === StateType.Parallel) return 'parallelState';
  return 'workflowState';
}

/** Top-level canvas wraps the inner component in ReactFlowProvider */
export function WorkflowCanvas(props: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

function WorkflowCanvasInner({
  states,
  transitions,
  onChange,
  onSelectState,
  onSelectTransition,
  readOnly,
}: WorkflowCanvasProps) {
  const nodes: Node[] = useMemo(
    () =>
      states.map(s => ({
        id: s.id,
        type: nodeTypeForState(s),
        position: { x: s.positionX, y: s.positionY },
        data: { state: s },
        draggable: !readOnly,
      })),
    [states, readOnly],
  );

  const edges: Edge[] = useMemo(
    () =>
      transitions.map(t => ({
        id: t.id,
        source: t.fromStateId,
        target: t.toStateId,
        type: 'workflowTransition',
        data: { transition: t },
        markerEnd: { type: MarkerType.ArrowClosed, color: CANVAS_TOKENS.edge },
      })),
    [transitions],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (readOnly) return;
      const nextNodes = applyNodeChanges(changes, nodes);
      const nextStates = nextNodes.map(n => {
        const s = states.find(st => st.id === n.id)!;
        return { ...s, positionX: n.position.x, positionY: n.position.y };
      });
      onChange(nextStates, transitions);
    },
    [nodes, states, transitions, onChange, readOnly],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (readOnly) return;
      const nextEdges = applyEdgeChanges(changes, edges);
      // Build O(1) lookup map so we never silently drop transitions on edge changes.
      // Edges not in the map are unexpected (onConnect handles new connections directly)
      // — warn and skip rather than creating a broken transition.
      const transitionMap = new Map<string, WorkflowTransitionDto>(
        transitions.map(t => [t.id, t]),
      );
      const nextTransitions = nextEdges.reduce<WorkflowTransitionDto[]>(
        (acc, e) => {
          const t = transitionMap.get(e.id);
          if (t) {
            acc.push(t);
          } else {
            console.warn(
              `[WorkflowCanvas] Edge ${e.id} not found in transitions map — skipping`,
            );
          }
          return acc;
        },
        [],
      );
      onChange(states, nextTransitions);
    },
    [edges, states, transitions, onChange, readOnly],
  );

  const onConnect = useCallback(
    (c: Connection) => {
      if (readOnly || !c.source || !c.target) return;
      const newTransition: WorkflowTransitionDto = {
        id: crypto.randomUUID(),
        fromStateId: c.source,
        toStateId: c.target,
        triggerType: TriggerType.Manual,
        triggerSpec: null,
        guardExpression: null,
        actions: [],
      };
      const newEdge: WorkflowTransitionEdgeType = {
        id: newTransition.id,
        source: newTransition.fromStateId,
        target: newTransition.toStateId,
        type: 'workflowTransition',
        data: { transition: newTransition },
        markerEnd: { type: MarkerType.ArrowClosed, color: CANVAS_TOKENS.edge },
      };
      // addEdge (from xyflow) is intentionally NOT called here — we manage edges via
      // the transitions array passed to onChange. The newEdge binding above is kept
      // only for type construction of WorkflowTransitionEdgeType.
      onChange(states, [...transitions, newTransition]);
    },
    [readOnly, states, transitions, edges, onChange],
  );

  return (
    <div className="w-full h-full" style={{ minHeight: '500px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_event, n) => onSelectState?.(n.id)}
        onEdgeClick={(_event, e) => onSelectTransition?.(e.id)}
        onPaneClick={() => {
          onSelectState?.(null);
          onSelectTransition?.(null);
        }}
        fitView
        defaultEdgeOptions={{ type: 'workflowTransition' }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} color="#e2e8f0" />
        <Controls />
        <MiniMap pannable zoomable maskColor={CANVAS_TOKENS.minimapMask} />
      </ReactFlow>
    </div>
  );
}
