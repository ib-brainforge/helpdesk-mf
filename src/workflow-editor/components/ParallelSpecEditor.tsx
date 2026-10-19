import {
  BaseCheckbox,
  BaseRadio,
  BaseRadioGroup,
  BaseSelect,
  BaseSelectItem,
} from '@brainforgeau/components';
import type { ParallelSpecDto, WorkflowStateDto } from '../types';

interface ParallelSpecEditorProps {
  spec: ParallelSpecDto;
  /** All states in the workflow excluding the parallel state itself */
  availableStates: WorkflowStateDto[];
  readOnly?: boolean;
  onChange: (next: ParallelSpecDto) => void;
}

export function ParallelSpecEditor({
  spec,
  availableStates,
  readOnly,
  onChange,
}: ParallelSpecEditorProps) {
  function update(patch: Partial<ParallelSpecDto>) {
    onChange({ ...spec, ...patch });
  }

  // Multi-select for branch starts uses BaseCheckbox since HeroUI BaseSelect is single-select.
  // REVIEW: Using checkbox list for multi-select since BaseSelect does not expose selectionMode=multiple.
  function toggleBranchState(stateId: string, checked: boolean) {
    if (readOnly) return;
    const current = spec.branchStartStateIds;
    const next = checked
      ? [...current, stateId]
      : current.filter(id => id !== stateId);
    update({ branchStartStateIds: next });
  }

  return (
    <div className="space-y-4 border-t border-default-200 pt-4 mt-4">
      <h4 className="text-xs font-semibold text-default-600 uppercase tracking-wide">
        Parallel Spec
      </h4>

      {/* Branch Start States — checkbox multi-select */}
      <div>
        <div className="text-xs font-medium text-default-700 mb-2">
          Branch Start States
        </div>
        {availableStates.length === 0 ? (
          <p className="text-xs text-default-400 italic">
            Add more states to select branch starts.
          </p>
        ) : (
          <div className="space-y-1 max-h-40 overflow-y-auto border border-default-200 rounded-md p-2">
            {availableStates.map(s => (
              <BaseCheckbox
                key={s.id}
                isSelected={spec.branchStartStateIds.includes(s.id)}
                onValueChange={checked => toggleBranchState(s.id, checked)}
                isDisabled={readOnly}
              >
                {s.name}
                {s.slug !== s.name.toLowerCase() && (
                  <span className="text-xs text-default-500"> ({s.slug})</span>
                )}
              </BaseCheckbox>
            ))}
          </div>
        )}
        {spec.branchStartStateIds.length > 0 && (
          <div className="text-xs text-default-500 mt-1">
            {spec.branchStartStateIds.length} branch
            {spec.branchStartStateIds.length !== 1 ? 'es' : ''} selected
          </div>
        )}
      </div>

      {/* Join State — single-select */}
      <BaseSelect
        label="Join State"
        selectedKey={spec.joinStateId ?? null}
        onSelectionChange={key => {
          update({ joinStateId: (key as string) || undefined });
        }}
        isDisabled={readOnly}
        size="sm"
        placeholder="Select join state"
      >
        {availableStates.map(s => (
          <BaseSelectItem key={s.id} value={s.id}>
            {s.name}
          </BaseSelectItem>
        ))}
      </BaseSelect>

      {/* Join Mode — BaseRadioGroup */}
      <BaseRadioGroup
        label="Join Mode"
        value={spec.joinMode}
        onChange={value =>
          update({ joinMode: value as ParallelSpecDto['joinMode'] })
        }
        isDisabled={readOnly}
      >
        <BaseRadio value="AllMustComplete">All must complete</BaseRadio>
        <BaseRadio value="AnyBranch">Any branch</BaseRadio>
      </BaseRadioGroup>
    </div>
  );
}
