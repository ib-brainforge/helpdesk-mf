import {
  BaseInput,
  BaseSelect,
  BaseSelectItem,
  BaseTextarea,
} from '@brainforgeau/components';
import type { TimerTriggerSpecDto, WorkflowTransitionDto } from '../types';
import { TriggerType } from '../types/enums';
import { ApprovalStepEditor } from './ApprovalStepEditor';
import { TimerTriggerEditor } from './TimerTriggerEditor';

interface TransitionInspectorProps {
  transition: WorkflowTransitionDto;
  readOnly?: boolean;
  onChange: (next: WorkflowTransitionDto) => void;
}

const TRIGGER_ITEMS = [
  { id: String(TriggerType.Manual), name: 'Manual' },
  { id: String(TriggerType.Event), name: 'Event' },
  { id: String(TriggerType.Timer), name: 'Timer' },
];

export function TransitionInspector({
  transition,
  readOnly,
  onChange,
}: TransitionInspectorProps) {
  function update(patch: Partial<WorkflowTransitionDto>) {
    onChange({ ...transition, ...patch });
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-900">
        Transition Properties
      </h3>

      <div className="text-xs text-gray-500 space-y-1">
        <div>
          <span className="font-medium">From:</span>{' '}
          {transition.fromStateId.slice(0, 8)}…
        </div>
        <div>
          <span className="font-medium">To:</span>{' '}
          {transition.toStateId.slice(0, 8)}…
        </div>
        {transition.sourceHandleId && (
          <div className="mt-1">
            <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-mono">
              Branch: {transition.sourceHandleId}
            </span>
          </div>
        )}
      </div>

      <BaseSelect
        label="Trigger Type"
        selectedKey={String(transition.triggerType)}
        onSelectionChange={keys => {
          const first = keys;
          if (first != null) {
            update({
              triggerType: first as TriggerType,
              triggerSpec: null,
            });
          }
        }}
        isDisabled={readOnly}
        size="sm"
      >
        {TRIGGER_ITEMS.map(item => <BaseSelectItem key={item.id}>{item.name}</BaseSelectItem>)}
      </BaseSelect>

      {/* Event name input — shown for Event trigger */}
      {transition.triggerType === TriggerType.Event && (
        <BaseInput
          label="Event Name"
          value={(transition.triggerSpec?.eventName as string) ?? ''}
          onValueChange={val => update({ triggerSpec: { eventName: val } })}
          readOnly={readOnly}
          labelPlacement="outside"
          size="sm"
          placeholder="e.g. approval.granted"
        />
      )}

      {/* Timer trigger editor — shown for Timer trigger */}
      {transition.triggerType === TriggerType.Timer && (
        <TimerTriggerEditor
          value={transition.triggerSpec as TimerTriggerSpecDto | null}
          readOnly={readOnly}
          onChange={spec =>
            update({ triggerSpec: spec as Record<string, unknown> | null })
          }
        />
      )}

      <BaseTextarea
        label="Guard Expression"
        value={transition.guardExpression ?? ''}
        onValueChange={val => update({ guardExpression: val || null })}
        readOnly={readOnly}
        labelPlacement="outside"
        size="sm"
        minRows={2}
        placeholder="Leave empty for no guard"
        classNames={{ input: 'font-mono text-xs' }}
      />

      <div className="text-xs text-gray-400 italic">
        Actions — configure in a future release.
      </div>

      {/* Approval section */}
      <ApprovalStepEditor
        value={transition.approvalSpec}
        readOnly={readOnly}
        onChange={approvalSpec =>
          update({ approvalSpec: approvalSpec ?? undefined })
        }
      />
    </div>
  );
}
