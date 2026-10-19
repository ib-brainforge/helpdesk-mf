import type {
  WorkflowStateDto,
  WorkflowTransitionDto,
} from '@brainforgeau/workflow-ui';
import { WorkflowCanvas } from '@brainforgeau/workflow-ui';
import {
  HELPDESK_CATEGORY_COLORS,
  HELPDESK_CATEGORY_OPTIONS,
  HELPDESK_STEP_TYPE_CATALOG,
} from './helpdeskWorkflowCatalog';

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
 * actions. Injects helpdesk's domain catalog (step types + ticket-lifecycle
 * categories + colours) into the shared @brainforgeau/workflow-ui canvas.
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
        stepTypeCatalog={HELPDESK_STEP_TYPE_CATALOG}
        categoryOptions={HELPDESK_CATEGORY_OPTIONS}
        categoryColors={HELPDESK_CATEGORY_COLORS}
      />
    </div>
  );
}
