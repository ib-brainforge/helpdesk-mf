import { useState } from 'react';
import { WorkflowCanvas } from '../canvas/WorkflowCanvas';
import { autoLayout } from '../canvas/layoutUtils';
import type {
  WorkflowDefinitionVersionDto,
  WorkflowStateDto,
  WorkflowTransitionDto,
} from '../types';
import { StateType } from '../types/enums';
import { WorkflowToolbar } from './WorkflowToolbar';

export interface WorkflowEditorProps {
  definitionId: string;
  version: WorkflowDefinitionVersionDto;
  readOnly?: boolean;
  onSaveDraft?: (
    states: WorkflowStateDto[],
    transitions: WorkflowTransitionDto[],
    startStateId: string | null,
  ) => Promise<unknown> | void;
  onPublish?: () => Promise<unknown> | void;
}

export function WorkflowEditor({
  definitionId,
  version,
  readOnly,
  onSaveDraft,
  onPublish,
}: WorkflowEditorProps) {
  const [states, setStates] = useState<WorkflowStateDto[]>(
    autoLayout(version.states),
  );
  const [transitions, setTransitions] = useState<WorkflowTransitionDto[]>(
    version.transitions,
  );
  const [dirty, setDirty] = useState(false);

  function handleCanvasChange(
    nextStates: WorkflowStateDto[],
    nextTransitions: WorkflowTransitionDto[],
  ) {
    setStates(nextStates);
    setTransitions(nextTransitions);
    setDirty(true);
  }

  async function handleSaveDraft() {
    await onSaveDraft?.(states, transitions, version.startStateId);
    setDirty(false);
  }

  // REVIEW: handleAddFromPalette accepts positionX/Y from the drag-drop coordinate;
  // the canvas converts the screen position to flow position via screenToFlowPosition.
  function handleAddFromPalette(
    newStateData: Omit<WorkflowStateDto, 'id'> & {
      positionX: number;
      positionY: number;
    },
  ) {
    const fullState: WorkflowStateDto = {
      ...newStateData,
      id: crypto.randomUUID(),
    };
    setStates(prev => [...prev, fullState]);
    setDirty(true);
  }

  // Canvas-level state change handler that also handles type transitions
  function handleStateChange(nodeId: string, next: WorkflowStateDto) {
    const prev = states.find(s => s.id === nodeId);
    const wasParallel = prev?.type === StateType.Parallel;
    const isNowParallel = next.type === StateType.Parallel;
    if (wasParallel && !isNowParallel) {
      setTransitions(current =>
        current.map(t =>
          t.fromStateId === next.id ? { ...t, sourceHandleId: null } : t,
        ),
      );
    }
    setStates(prev => prev.map(s => (s.id === next.id ? next : s)));
    setDirty(true);
  }

  return (
    <div className="flex flex-col h-full">
      <WorkflowToolbar
        version={version}
        dirty={dirty}
        readOnly={readOnly}
        definitionId={definitionId}
        onSaveDraft={handleSaveDraft}
        onPublish={onPublish}
      />
      {/* Canvas takes full width — state/transition editing is now inline in nodes */}
      <div className="flex-1 overflow-hidden">
        <WorkflowCanvas
          states={states}
          transitions={transitions}
          onChange={handleCanvasChange}
          readOnly={readOnly}
          onAddState={readOnly ? undefined : handleAddFromPalette}
        />
      </div>
    </div>
  );
}
