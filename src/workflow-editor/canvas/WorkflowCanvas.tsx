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
import { useCallback, useMemo, useRef } from 'react';
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

  // Keep refs for latest states/transitions so callbacks stay stable across renders.
  // This is critical: if `handleStateChange` changes on every state update, the
  // `nodes` useMemo produces a new array and each node's `data` object is a new
  // reference — which makes xyflow's internal drag tracker lose track of node
  // identity and fall back to pane drag (= whole canvas moves instead of node).
  const statesRef = useRef(states);
  const transitionsRef = useRef(transitions);
  const readOnlyRef = useRef(readOnly);
  const onChangeRef = useRef(onChange);
  statesRef.current = states;
  transitionsRef.current = transitions;
  readOnlyRef.current = readOnly;
  onChangeRef.current = onChange;

  // STABLE callbacks — empty dep array; read latest via refs.
  const handleStateChange = useCallback(
    (nodeId: string, next: WorkflowStateDto) => {
      if (readOnlyRef.current) return;
      const currStates = statesRef.current;
      const currTransitions = transitionsRef.current;
      const prev = currStates.find(s => s.id === nodeId);
      const wasParallel = prev?.type === StateType.Parallel;
      const isNowParallel = next.type === StateType.Parallel;
      let nextTransitions = currTransitions;
      if (wasParallel && !isNowParallel) {
        nextTransitions = currTransitions.map(t =>
          t.fromStateId === nodeId ? { ...t, sourceHandleId: null } : t,
        );
      }
      const nextStates = currStates.map(s => (s.id === nodeId ? next : s));
      onChangeRef.current(nextStates, nextTransitions);
    },
    [],
  );

  const handleStateDelete = useCallback((nodeId: string) => {
    if (readOnlyRef.current) return;
    const currStates = statesRef.current;
    const currTransitions = transitionsRef.current;
    const nextStates = currStates.filter(s => s.id !== nodeId);
    const nextTransitions = currTransitions.filter(
      t => t.fromStateId !== nodeId && t.toStateId !== nodeId,
    );
    onChangeRef.current(nextStates, nextTransitions);
  }, []);

  const handleTransitionChange = useCallback(
    (edgeId: string, next: WorkflowTransitionDto) => {
      if (readOnlyRef.current) return;
      const currStates = statesRef.current;
      const currTransitions = transitionsRef.current;
      const nextTransitions = currTransitions.map(t =>
        t.id === edgeId ? next : t,
      );
      onChangeRef.current(currStates, nextTransitions);
    },
    [],
  );

  const handleTransitionDelete = useCallback((edgeId: string) => {
    if (readOnlyRef.current) return;
    const currStates = statesRef.current;
    const currTransitions = transitionsRef.current;
    const nextTransitions = currTransitions.filter(t => t.id !== edgeId);
    onChangeRef.current(currStates, nextTransitions);
  }, []);

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
    // handleStateChange + handleStateDelete are stable (ref-based); omitted from deps.
    [states, readOnly],
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
    // handleTransitionChange + handleTransitionDelete are stable (ref-based); omitted from deps.
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
