import {
  BaseInput,
  BaseSelect,
  BaseSelectItem,
  BaseTextarea,
} from '@brainforgeau/components';
import type { WorkflowStateDto } from '../types';
import { StateCategory, StateType } from '../types/enums';
import { ParallelSpecEditor } from './ParallelSpecEditor';

interface StateInspectorProps {
  state: WorkflowStateDto;
  /** All states in the workflow — used to populate the ParallelSpecEditor pickers */
  allStates?: WorkflowStateDto[];
  readOnly?: boolean;
  onChange: (next: WorkflowStateDto) => void;
}

const CATEGORY_ITEMS = [
  { id: String(StateCategory.New), name: 'New' },
  { id: String(StateCategory.Open), name: 'Open' },
  { id: String(StateCategory.Pending), name: 'Pending' },
  { id: String(StateCategory.Resolved), name: 'Resolved' },
  { id: String(StateCategory.Closed), name: 'Closed' },
];

const TYPE_ITEMS = [
  { id: String(StateType.Initial), name: 'Initial' },
  { id: String(StateType.Normal), name: 'Normal' },
  { id: String(StateType.Parallel), name: 'Parallel' },
  { id: String(StateType.Terminal), name: 'Terminal' },
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function StateInspector({
  state,
  allStates = [],
  readOnly,
  onChange,
}: StateInspectorProps) {
  function update(patch: Partial<WorkflowStateDto>) {
    onChange({ ...state, ...patch });
  }

  function handleNameChange(name: string) {
    // Auto-update slug only if it still matches the auto-generated pattern
    const currentAutoSlug = slugify(state.name);
    const newSlug = state.slug === currentAutoSlug ? slugify(name) : state.slug;
    update({ name, slug: newSlug });
  }

  function handleTypeChange(next: StateType) {
    if (next === StateType.Parallel) {
      // Scaffold default parallelSpec on type change to Parallel
      onChange({
        ...state,
        type: next,
        parallelSpec: state.parallelSpec ?? {
          branchStartStateIds: [],
          joinStateId: '',
          joinMode: 'AllMustComplete',
        },
      });
    } else {
      // Clear parallelSpec when switching away from Parallel
      onChange({ ...state, type: next, parallelSpec: null });
    }
  }

  // States available for parallelSpec pickers (all states except this one)
  const availableForSpec = allStates.filter(s => s.id !== state.id);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-900">State Properties</h3>

      <BaseInput
        label="Name"
        value={state.name}
        onValueChange={handleNameChange}
        readOnly={readOnly}
        labelPlacement="outside"
        size="sm"
      />

      <BaseInput
        label="Slug"
        value={state.slug}
        onValueChange={slug => update({ slug })}
        readOnly={readOnly}
        labelPlacement="outside"
        size="sm"
        description="URL-safe identifier (auto-generated from name)"
      />

      <BaseTextarea
        label="Description"
        value={state.description ?? ''}
        onValueChange={desc => update({ description: desc || null })}
        readOnly={readOnly}
        labelPlacement="outside"
        size="sm"
        minRows={2}
      />

      <BaseSelect
        label="Category"
        selectedKey={String(state.category)}
        onSelectionChange={keys => {
          const first = keys;
          if (first != null) update({ category: first as StateCategory });
        }}
        isDisabled={readOnly}
        size="sm"
      >
        {CATEGORY_ITEMS.map(item => (
          <BaseSelectItem key={item.id} value={item.id}>{item.name}</BaseSelectItem>
        ))}
      </BaseSelect>

      <BaseSelect
        label="Type"
        selectedKey={String(state.type)}
        onSelectionChange={keys => {
          const first = keys;
          if (first != null) handleTypeChange(first as StateType);
        }}
        isDisabled={readOnly}
        size="sm"
      >
        {TYPE_ITEMS.map(item => (
          <BaseSelectItem key={item.id} value={item.id}>{item.name}</BaseSelectItem>
        ))}
      </BaseSelect>

      {/* Parallel spec editor — shown only when type is Parallel */}
      {state.type === StateType.Parallel && state.parallelSpec && (
        <ParallelSpecEditor
          spec={state.parallelSpec}
          availableStates={availableForSpec}
          readOnly={readOnly}
          onChange={nextSpec => update({ parallelSpec: nextSpec })}
        />
      )}
    </div>
  );
}
