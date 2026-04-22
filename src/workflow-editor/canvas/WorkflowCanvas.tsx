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
import { useLogger } from '@brainforgeau/observability';
import { useCallback, useMemo } from 'react';
import { WorkflowTransitionEdge } from '../edges/WorkflowTransitionEdge';
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
  const logger = useLogger('WorkflowCanvas');

  // Stable callbacks so memoised nodes/edges can reference them without re-creating
  const handleStateChange = useCallback(
    (nodeId: string, next: WorkflowStateDto) => {
      if (readOnly) return;
      // If type changed away from Parallel, clear sourceHandleId on related transitions
      const prev = states.find(s => s.id === nodeId);
      const wasParallel = prev?.type === StateType.Parallel;
      const isNowParallel = next.type === StateType.Parallel;
      let nextTransitions = transitions;
      if (wasParallel && !isNowParallel) {
        nextTransitions = transitions.map(t =>
          t.fromStateId === nodeId ? { ...t, sourceHandleId: null } : t,
        );
      }
      const nextStates = states.map(s => (s.id === nodeId ? next : s));
      onChange(nextStates, nextTransitions);
    },
    [readOnly, states, transitions, onChange],
  );

  const handleStateDelete = useCallback(
    (nodeId: string) => {
      if (readOnly) return;
      const nextStates = states.filter(s => s.id !== nodeId);
      const nextTransitions = transitions.filter(
        t => t.fromStateId !== nodeId && t.toStateId !== nodeId,
      );
      onChange(nextStates, nextTransitions);
    },
    [readOnly, states, transitions, onChange],
  );

  const handleTransitionChange = useCallback(
    (edgeId: string, next: WorkflowTransitionDto) => {
      if (readOnly) return;
      const nextTransitions = transitions.map(t => (t.id === edgeId ? next : t));
      onChange(states, nextTransitions);
    },
    [readOnly, states, transitions, onChange],
  );

  const handleTransitionDelete = useCallback(
    (edgeId: string) => {
      if (readOnly) return;
      const nextTransitions = transitions.filter(t => t.id !== edgeId);
      onChange(states, nextTransitions);
    },
    [readOnly, states, transitions, onChange],
  );

  const nodes: Node[] = useMemo(
    () =>
      states.map(s => ({
        id: s.id,
        type: nodeTypeForState(s),
        position: { x: s.positionX, y: s.positionY },
        data: {
          state: s,
          allStates: states,
          onChange: handleStateChange,
          onDelete: handleStateDelete,
        },
        draggable: !readOnly,
      })),
    [states, handleStateChange, handleStateDelete, readOnly],
  );

  const edges: Edge[] = useMemo(
    () =>
      transitions.map(t => ({
        id: t.id,
        source: t.fromStateId,
        target: t.toStateId,
        // Pass sourceHandle so xyflow renders from the correct parallel branch anchor
        sourceHandle: t.sourceHandleId ?? undefined,
        type: 'workflowTransition',
        data: {
          transition: t,
          onChange: handleTransitionChange,
          onDelete: handleTransitionDelete,
        },
        markerEnd: { type: MarkerType.ArrowClosed, color: CANVAS_TOKENS.edge },
      })),
    [transitions, handleTransitionChange, handleTransitionDelete],
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
      const transitionMap = new Map<string, WorkflowTransitionDto>(
        transitions.map(t => [t.id, t]),
      );
      const nextTransitions = nextEdges.reduce<WorkflowTransitionDto[]>(
        (acc, e) => {
          const t = transitionMap.get(e.id);
          if (t) {
            acc.push(t);
          } else {
            logger.warn(`Edge ${e.id} not found in transitions map — skipping`);
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
        // Capture which handle was used — important for Parallel state branch wiring
        sourceHandleId: c.sourceHandle ?? null,
      } satisfies WorkflowTransitionDto;
      onChange(states, [...transitions, newTransition]);
    },
    [readOnly, states, transitions, onChange],
  );

  return (
    <div className="w-full h-full min-h-[500px]">
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
        // Belt + suspenders: per-node `draggable` should be sufficient, but
        // explicitly flipping canvas-level nodesDraggable ensures xyflow v12
        // disables drag-to-move deterministically when in read-only mode.
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        edgesReconnectable={!readOnly}
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
