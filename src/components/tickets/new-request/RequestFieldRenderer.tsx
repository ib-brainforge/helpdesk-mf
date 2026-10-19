import {
  BaseCheckbox,
  BaseInput,
  BaseSelect,
  BaseSelectItem,
  BaseTextarea,
} from '@brainforgeau/components';
import type { FC } from 'react';
import { AssetPicker, type PickedAsset } from './AssetPicker';
import type { AnswerValue, FieldSpec } from './request-field-schema';

/**
 * Renders one question from a FieldSpec.
 *
 * Deliberately dumb: it takes a spec and a value and reports changes. That is
 * what makes the hard-coded question map replaceable later by definitions
 * loaded from CustomFieldDefinition rows, since only the source of the specs
 * would change, not this component.
 */

interface Props {
  spec: FieldSpec;
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
  /** Shown after a failed submit attempt, not while the user is still typing. */
  showError?: boolean;
  /**
   * asset fields only. The chosen vehicles as objects, because the answer
   * value holds only their labels and the ticket also needs their ids to link
   * them.
   */
  assets?: PickedAsset[];
  onAssetsChange?: (assets: PickedAsset[]) => void;
}

const ChecklistField: FC<Props> = ({ spec, value, onChange }) => {
  const selected = Array.isArray(value) ? value : [];
  const toggle = (label: string) => {
    onChange(
      selected.includes(label)
        ? selected.filter(v => v !== label)
        : [...selected, label],
    );
  };

  return (
    <div className="border-light grid grid-cols-1 gap-3 rounded-lg border p-3 sm:grid-cols-2">
      {(spec.groups ?? []).map(group => (
        <div key={group.name}>
          <BaseCheckbox
            isSelected={selected.includes(group.name)}
            onChange={() => toggle(group.name)}
          >
            <span className="font-medium">{group.name}</span>
          </BaseCheckbox>
          {/*
            Children are indented rather than nested controls: ticking a parent
            does not tick its children. A request for "Black Box" and a request
            for "Black Box: CANBUS" are different jobs, and auto-selecting would
            silently widen the second into the first.
          */}
          {group.items && (
            <div className="mt-1.5 ml-5 space-y-1.5">
              {group.items.map(item => (
                <BaseCheckbox
                  key={item}
                  isSelected={selected.includes(item)}
                  onChange={() => toggle(item)}
                >
                  {item}
                </BaseCheckbox>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export const RequestFieldRenderer: FC<Props> = props => {
  const { spec, value, onChange, showError } = props;
  const errorProps = showError
    ? { isInvalid: true, errorMessage: 'This is required' }
    : {};

  if (spec.kind === 'checklist') {
    return (
      <div>
        <span className="text-gray mb-2 block text-sm font-medium">
          {spec.label}
          <span className="text-red ml-1">*</span>
        </span>
        <ChecklistField {...props} />
      </div>
    );
  }

  if (spec.kind === 'asset') {
    return (
      <AssetPicker
        label={spec.label}
        placeholder={spec.placeholder}
        value={props.assets ?? []}
        onChange={assets => {
          props.onAssetsChange?.(assets);
          onChange(assets.map(a => a.label));
        }}
        showError={showError}
      />
    );
  }

  if (spec.kind === 'textarea') {
    return (
      <BaseTextarea
        label={spec.label}
        isRequired
        placeholder={spec.placeholder}
        value={typeof value === 'string' ? value : ''}
        onValueChange={onChange}
        minRows={4}
        {...errorProps}
      />
    );
  }

  if (spec.kind === 'select') {
    /*
     * The first option is the prompt ("Select"), shown as the placeholder and
     * never listed. It used to be an ordinary item: picking it looked like an
     * answer but counted as none, so Next refused to move with no visible
     * reason. A placeholder cannot be picked.
     */
    const [prompt, ...choices] = spec.options ?? [];
    return (
      <BaseSelect
        label={spec.label}
        isRequired
        placeholder={prompt}
        // null, not '', when unanswered: the placeholder only shows when
        // nothing is selected, and '' is a key that matches no item.
        selectedKey={typeof value === 'string' && value ? value : null}
        onSelectionChange={key => {
          if (typeof key === 'string') onChange(key);
        }}
        {...errorProps}
      >
        {choices.map(opt => (
          <BaseSelectItem key={opt} value={opt}>
            {opt}
          </BaseSelectItem>
        ))}
      </BaseSelect>
    );
  }

  return (
    <BaseInput
      label={spec.label}
      isRequired
      // A date question uses the native date control rather than the library's
      // picker: these are plain day values with no time or range, and the
      // native control needs no extra state to stay in step with the answers map.
      type={spec.kind === 'date' ? 'date' : 'text'}
      placeholder={spec.placeholder}
      value={typeof value === 'string' ? value : ''}
      onValueChange={onChange}
      {...errorProps}
    />
  );
};
