import {
  Background,
  BackgroundVariant,
  type Connection,
  Controls,
  type Edge,
  MarkerType,
  MiniMap,
  type Node,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useLogger } from '@brainforgeau/observability';
import { useCallback, useEffect, useRef } from 'react';
import { WorkflowTransitionEdge } from '../edges/WorkflowTransitionEdge';
import type { WorkflowStateDto, WorkflowTransitionDto } from '../types';
import { type StateCategory, StateType, TriggerType } from '../types/enums';
import { CANVAS_TOKENS } from './canvasTheme';
import { ParallelStateNode } from './nodes/ParallelStateNode';
import { TerminalStateNode } from './nodes/TerminalStateNode';
import { WorkflowStateNode } from './nodes/WorkflowStateNode';

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
  onAddState?: (
    state: Omit<WorkflowStateDto, 'id'> & {
      positionX: number;
      positionY: number;
    },
  ) => void;
}

const NODE_TYPES = {
  workflowState: WorkflowStateNode,
  terminalState: TerminalStateNode,
  parallelState: ParallelStateNode,
};

const EDGE_TYPES = {
  workflowTransition: WorkflowTransitionEdge,
};

function nodeTypeForState(s: WorkflowStateDto): string {
  if (s.type === StateType.Terminal) return 'terminalState';
  if (s.type === StateType.Parallel) return 'parallelState';
  return 'workflowState';
}

export function WorkflowCanvas(props: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function buildEdges(
  transitions: WorkflowTransitionDto[],
  onTransitionChange: (edgeId: string, next: WorkflowTransitionDto) => void,
  onTransitionDelete: (edgeId: string) => void,
): Edge[] {
  return transitions.map(t => ({
    id: t.id,
    source: t.fromStateId,
    target: t.toStateId,
    sourceHandle: t.sourceHandleId ?? undefined,
    type: 'workflowTransition',
    data: {
      transition: t,
      onChange: onTransitionChange,
      onDelete: onTransitionDelete,
    },
    markerEnd: { type: MarkerType.ArrowClosed, color: CANVAS_TOKENS.edge },
  }));
}

function WorkflowCanvasInner({
  states,
  transitions,
  onChange,
  onSelectState,
  onSelectTransition,
  readOnly,
  onAddState,
}: WorkflowCanvasProps) {
  const logger = useLogger('WorkflowCanvas');
  const { screenToFlowPosition } = useReactFlow();

  // Refs keep inline-node callbacks and drop handlers reading latest props
  // without forcing the xyflow-owned node/edge stores to rebuild.
  const statesRef = useRef(states);
  const transitionsRef = useRef(transitions);
  const readOnlyRef = useRef(readOnly);
  const onChangeRef = useRef(onChange);
  const onAddStateRef = useRef(onAddState);
  statesRef.current = states;
  transitionsRef.current = transitions;
  readOnlyRef.current = readOnly;
  onChangeRef.current = onChange;
  onAddStateRef.current = onAddState;

  // Stable callbacks for inline node/edge editing (empty deps, ref-based).
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

  // xyflow-owned node/edge state is critical: ResizeObserver measurements
  // and internal node refs persist across external prop updates, which is
  // what flips `visibility: hidden` off and lets drag/connect fire.
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Sync external `states` → internal node store. Merges by id so that
  // existing node objects (and their measured dimensions) are preserved
  // when only a position/data field changes.
  useEffect(() => {
    setNodes(currentNodes => {
      const byId = new Map(currentNodes.map(n => [n.id, n]));
      return states.map(s => {
        const existing = byId.get(s.id);
        const nextType = nodeTypeForState(s);
        const nextData = {
          state: s,
          allStates: states,
          onChange: handleStateChange,
          onDelete: handleStateDelete,
        };
        if (existing) {
          return {
            ...existing,
            type: nextType,
            position:
              existing.position.x === s.positionX &&
              existing.position.y === s.positionY
                ? existing.position
                : { x: s.positionX, y: s.positionY },
            data: nextData,
            draggable: !readOnly,
          };
        }
        return {
          id: s.id,
          type: nextType,
          position: { x: s.positionX, y: s.positionY },
          data: nextData,
          draggable: !readOnly,
        };
      });
    });
  }, [states, readOnly, setNodes, handleStateChange, handleStateDelete]);

  useEffect(() => {
    setEdges(() =>
      buildEdges(transitions, handleTransitionChange, handleTransitionDelete),
    );
  }, [transitions, setEdges, handleTransitionChange, handleTransitionDelete]);

  // Emit final position to parent on drag-stop (not during every frame).
  const handleNodeDragStop = useCallback(
    (_event: unknown, _node: Node, draggedNodes: Node[]) => {
      if (readOnlyRef.current) return;
      const currStates = statesRef.current;
      const byId = new Map(draggedNodes.map(n => [n.id, n.position] as const));
      const nextStates = currStates.map(s => {
        const p = byId.get(s.id);
        return p
          ? { ...s, positionX: Math.round(p.x), positionY: Math.round(p.y) }
          : s;
      });
      onChangeRef.current(nextStates, transitionsRef.current);
    },
    [],
  );

  const handleNodesDelete = useCallback((deleted: Node[]) => {
    if (readOnlyRef.current) return;
    const ids = new Set(deleted.map(n => n.id));
    const currStates = statesRef.current;
    const currTransitions = transitionsRef.current;
    const nextStates = currStates.filter(s => !ids.has(s.id));
    const nextTransitions = currTransitions.filter(
      t => !ids.has(t.fromStateId) && !ids.has(t.toStateId),
    );
    onChangeRef.current(nextStates, nextTransitions);
  }, []);

  const handleEdgesDelete = useCallback((deleted: Edge[]) => {
    if (readOnlyRef.current) return;
    const ids = new Set(deleted.map(e => e.id));
    const currStates = statesRef.current;
    const currTransitions = transitionsRef.current;
    const nextTransitions = currTransitions.filter(t => !ids.has(t.id));
    onChangeRef.current(currStates, nextTransitions);
  }, []);

  const onConnect = useCallback((c: Connection) => {
    if (readOnlyRef.current || !c.source || !c.target) return;
    const newTransition: WorkflowTransitionDto = {
      id: crypto.randomUUID(),
      fromStateId: c.source,
      toStateId: c.target,
      triggerType: TriggerType.Manual,
      triggerSpec: null,
      guardExpression: null,
      actions: [],
      sourceHandleId: c.sourceHandle ?? null,
    } satisfies WorkflowTransitionDto;
    onChangeRef.current(statesRef.current, [
      ...transitionsRef.current,
      newTransition,
    ]);
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData('application/x-workflow-node');
      if (!raw) return;
      try {
        const payload = JSON.parse(raw) as {
          stateType: StateType;
          category: StateCategory;
          label: string;
        };
        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
        onAddStateRef.current?.({
          name: payload.label,
          slug: slugify(payload.label),
          description: null,
          category: payload.category,
          type: payload.stateType,
          sortOrder: 99,
          positionX: Math.round(position.x),
          positionY: Math.round(position.y),
          metadata: {},
          parallelSpec: null,
        });
      } catch {
        logger.warn('workflow_canvas_drop_parse_error');
      }
    },
    [screenToFlowPosition, logger],
  );

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  return (
    <div
      className="w-full h-full min-h-[500px]"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={handleNodeDragStop}
        onNodesDelete={handleNodesDelete}
        onEdgesDelete={handleEdgesDelete}
        onConnect={onConnect}
        onNodeClick={(_event, n) => onSelectState?.(n.id)}
        onEdgeClick={(_event, e) => onSelectTransition?.(e.id)}
        onPaneClick={() => {
          onSelectState?.(null);
          onSelectTransition?.(null);
        }}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        edgesReconnectable={!readOnly}
        deleteKeyCode={readOnly ? null : ['Backspace', 'Delete']}
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
