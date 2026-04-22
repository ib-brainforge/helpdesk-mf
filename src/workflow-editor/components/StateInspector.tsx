import {
  BaseInput,
  BaseSelect,
  BaseSelectItem,
  BaseTextarea,
} from '@brainforgeau/components';
import type { WorkflowStateDto } from '../types';
import { StateCategory, StateType } from '../types/enums';

interface StateInspectorProps {
  state: WorkflowStateDto;
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
  // TODO(plan-4): re-enable Parallel + scaffold parallelSpec UI
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

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-900">State Properties</h3>

      <BaseInput
        label="Name"
        value={state.name}
        onValueChange={handleNameChange}
        isReadOnly={readOnly}
        labelPlacement="outside"
        size="sm"
      />

      <BaseInput
        label="Slug"
        value={state.slug}
        onValueChange={slug => update({ slug })}
        isReadOnly={readOnly}
        labelPlacement="outside"
        size="sm"
        description="URL-safe identifier (auto-generated from name)"
      />

      <BaseTextarea
        label="Description"
        value={state.description ?? ''}
        onValueChange={desc => update({ description: desc || null })}
        isReadOnly={readOnly}
        labelPlacement="outside"
        size="sm"
        minRows={2}
      />

      <BaseSelect
        label="Category"
        selectedKeys={new Set([String(state.category)])}
        onSelectionChange={keys => {
          const first = Array.from(keys)[0];
          if (first != null)
            update({ category: Number(first) as StateCategory });
        }}
        isDisabled={readOnly}
        labelPlacement="outside"
        size="sm"
        items={CATEGORY_ITEMS}
      >
        {item => <BaseSelectItem key={item.id}>{item.name}</BaseSelectItem>}
      </BaseSelect>

      <BaseSelect
        label="Type"
        selectedKeys={new Set([String(state.type)])}
        onSelectionChange={keys => {
          const first = Array.from(keys)[0];
          if (first != null) update({ type: Number(first) as StateType });
        }}
        isDisabled={readOnly}
        labelPlacement="outside"
        size="sm"
        items={TYPE_ITEMS}
      >
        {item => <BaseSelectItem key={item.id}>{item.name}</BaseSelectItem>}
      </BaseSelect>
    </div>
  );
}
