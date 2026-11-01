import {
  BaseCheckbox,
  BaseInput,
  BaseSelect,
  BaseSelectItem,
  BaseTextarea,
} from '@brainforgeau/components';
import type { FC } from 'react';
import { AssetPicker, type PickedAsset } from './AssetPicker';
import type { AnswerValue, RequestField } from './request-fields';

/**
 * Renders one question: a custom field the category asks, as
 * `GET v1/categories/available` lists it.
 *
 * Deliberately dumb: it takes a field and a value and reports changes. The
 * field's type decides the control; its description, when it has one, is the
 * placeholder.
 */

interface Props {
  field: RequestField;
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
  /** Shown after a failed attempt to move on, not while the user is still typing. */
  showError?: boolean;
}

const ChecklistField: FC<Props> = ({ field, value, onChange }) => {
  const selected = Array.isArray(value) ? (value as string[]) : [];
  const toggle = (id: string) => {
    onChange(
      selected.includes(id)
        ? selected.filter(v => v !== id)
        : [...selected, id],
    );
  };
  const groups = field.options.filter(o => !o.parentOptionId);

  return (
    <div className="border-light grid grid-cols-1 gap-3 rounded-lg border p-3 sm:grid-cols-2">
      {groups.map(group => {
        const children = field.options.filter(
          o => o.parentOptionId === group.id,
        );
        return (
          <div key={group.id}>
            <BaseCheckbox
              isSelected={selected.includes(group.id)}
              onChange={() => toggle(group.id)}
            >
              <span className={children.length > 0 ? 'font-medium' : ''}>
                {group.value}
              </span>
            </BaseCheckbox>
            {/*
              Children are indented rather than nested controls: ticking a
              parent does not tick its children. A request for "Black Box" and
              a request for "Black Box: CANBUS" are different jobs, and
              auto-selecting would silently widen the second into the first.
            */}
            {children.length > 0 && (
              <div className="mt-1.5 ml-5 space-y-1.5">
                {children.map(item => (
                  <BaseCheckbox
                    key={item.id}
                    isSelected={selected.includes(item.id)}
                    onChange={() => toggle(item.id)}
                  >
                    {item.value}
                  </BaseCheckbox>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const INPUT_TYPES: Partial<Record<RequestField['fieldType'], string>> = {
  // A date question uses the native date control rather than the library's
  // picker: these are plain day values with no time or range, and the native
  // control needs no extra state to stay in step with the answers map.
  Date: 'date',
  Number: 'number',
  Email: 'email',
  Url: 'url',
};

export const RequestFieldRenderer: FC<Props> = props => {
  const { field, value, onChange, showError } = props;
  const required = field.isRequired;
  const placeholder = field.description ?? undefined;
  const errorProps = showError
    ? { isInvalid: true, errorMessage: 'This is required' }
    : {};

  if (field.fieldType === 'MultiSelect') {
    return (
      <div>
        <span className="text-gray mb-2 block text-sm font-medium">
          {field.name}
          {required && <span className="text-red ml-1">*</span>}
        </span>
        <ChecklistField {...props} />
        {showError && (
          <p className="text-red-dark mt-1 text-xs">This is required</p>
        )}
      </div>
    );
  }

  if (field.fieldType === 'Asset') {
    return (
      <AssetPicker
        label={field.name}
        placeholder={placeholder}
        value={Array.isArray(value) ? (value as PickedAsset[]) : []}
        onChange={assets => onChange(assets)}
        showError={showError}
        isRequired={required}
      />
    );
  }

  if (field.fieldType === 'Checkbox') {
    return (
      <BaseCheckbox isSelected={value === true} onValueChange={onChange}>
        {field.name}
        {required && <span className="text-red ml-1">*</span>}
      </BaseCheckbox>
    );
  }

  if (field.fieldType === 'MultilineText') {
    return (
      <BaseTextarea
        label={field.name}
        isRequired={required}
        placeholder={placeholder}
        value={typeof value === 'string' ? value : ''}
        onValueChange={onChange}
        minRows={4}
        {...errorProps}
      />
    );
  }

  if (field.fieldType === 'Dropdown') {
    return (
      <BaseSelect
        label={field.name}
        isRequired={required}
        placeholder={placeholder ?? 'Select'}
        // null, not '', when unanswered: the placeholder only shows when
        // nothing is selected, and '' is a key that matches no item.
        selectedKey={typeof value === 'string' && value ? value : null}
        onSelectionChange={key => {
          if (typeof key === 'string') onChange(key);
        }}
        {...errorProps}
      >
        {field.options.map(opt => (
          <BaseSelectItem key={opt.id} value={opt.id}>
            {opt.value}
          </BaseSelectItem>
        ))}
      </BaseSelect>
    );
  }

  return (
    <BaseInput
      label={field.name}
      isRequired={required}
      type={INPUT_TYPES[field.fieldType] ?? 'text'}
      placeholder={placeholder}
      value={typeof value === 'string' ? value : ''}
      onValueChange={onChange}
      {...errorProps}
    />
  );
};
