import { useState } from 'react';
import { WorkflowCanvas } from '../canvas/WorkflowCanvas';
import { autoLayout } from '../canvas/layoutUtils';
import type {
  WorkflowDefinitionVersionDto,
  WorkflowStateDto,
  WorkflowTransitionDto,
} from '../types';
import { StateInspector } from './StateInspector';
import { TransitionInspector } from './TransitionInspector';
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
  const [selectedStateId, setSelectedStateId] = useState<string | null>(null);
  const [selectedTransitionId, setSelectedTransitionId] = useState<
    string | null
  >(null);
  const [dirty, setDirty] = useState(false);

  const selectedState = states.find(s => s.id === selectedStateId) ?? null;
  const selectedTransition =
    transitions.find(t => t.id === selectedTransitionId) ?? null;

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

  function handleAddState(
    partial: Omit<WorkflowStateDto, 'id' | 'positionX' | 'positionY'>,
  ) {
    const newState: WorkflowStateDto = {
      ...partial,
      id: crypto.randomUUID(),
      positionX: 100 + states.length * 60,
      positionY: 100 + Math.floor(states.length / 4) * 150,
    };
    setStates(prev => [...prev, newState]);
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
        onAddState={handleAddState}
      />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <WorkflowCanvas
            states={states}
            transitions={transitions}
            onChange={handleCanvasChange}
            onSelectState={id => {
              setSelectedStateId(id);
              setSelectedTransitionId(null);
            }}
            onSelectTransition={id => {
              setSelectedTransitionId(id);
              setSelectedStateId(null);
            }}
            readOnly={readOnly}
          />
        </div>
        <aside
          className="w-80 border-l border-gray-200 p-4 overflow-y-auto bg-white flex-shrink-0"
          aria-label="Properties panel"
        >
          {selectedState && (
            <StateInspector
              state={selectedState}
              readOnly={readOnly}
              onChange={next => {
                setStates(prev => prev.map(s => (s.id === next.id ? next : s)));
                setDirty(true);
              }}
            />
          )}
          {selectedTransition && (
            <TransitionInspector
              transition={selectedTransition}
              readOnly={readOnly}
              onChange={next => {
                setTransitions(prev =>
                  prev.map(t => (t.id === next.id ? next : t)),
                );
                setDirty(true);
              }}
            />
          )}
          {!selectedState && !selectedTransition && (
            <p className="text-sm text-gray-500">
              Select a state or transition to edit its properties.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
