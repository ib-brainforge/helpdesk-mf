import { WorkflowCanvas } from '../canvas/WorkflowCanvas';
import type {
  WorkflowStateDto,
  WorkflowTransitionDto,
} from '../types';

export interface WorkflowEditorProps {
  states: WorkflowStateDto[];
  transitions: WorkflowTransitionDto[];
  onChange: (
    states: WorkflowStateDto[],
    transitions: WorkflowTransitionDto[],
  ) => void;
  onAddFromPalette?: (
    state: Omit<WorkflowStateDto, 'id'> & {
      positionX: number;
      positionY: number;
    },
  ) => void;
  readOnly?: boolean;
}

/**
 * Thin canvas wrapper. State is owned by the host page so Validate/Save/
 * Publish controls can live in the page's top bar without a second row of
 * actions.
 */
export function WorkflowEditor({
  states,
  transitions,
  onChange,
  onAddFromPalette,
  readOnly,
}: WorkflowEditorProps) {
  return (
    <div className="h-full w-full">
      <WorkflowCanvas
        states={states}
        transitions={transitions}
        onChange={onChange}
        readOnly={readOnly}
        onAddState={readOnly ? undefined : onAddFromPalette}
      />
    </div>
  );
}
