import type { ScopeOption } from '@/hooks/useScopeNames';
import {
  BaseAutocomplete,
  BaseAutocompleteItem,
} from '@brainforgeau/components';
import { type FC, useMemo, useState } from 'react';

/**
 * A searchable single choice from a list already in memory (tenants,
 * organisations). BaseAutocomplete never filters its own items, so matching
 * is done here.
 */
export const ScopeSelect: FC<{
  label: string;
  options: ScopeOption[];
  value: string | null;
  onChange: (id: string | null) => void;
  /** Shown when nothing is chosen; also what "nothing chosen" means. */
  placeholder: string;
  isDisabled?: boolean;
}> = ({ label, options, value, onChange, placeholder, isDisabled }) => {
  const [query, setQuery] = useState('');
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle
      ? options.filter(o => o.name.toLowerCase().includes(needle))
      : options;
  }, [options, query]);
  const selected = options.find(o => o.id === value);

  return (
    <BaseAutocomplete
      label={label}
      placeholder={placeholder}
      isDisabled={isDisabled}
      selectedKey={value}
      onSelectionChange={key => onChange(typeof key === 'string' ? key : null)}
      onValueChange={setQuery}
      onOpenChange={open => {
        if (!open) setQuery('');
      }}
      renderSelectedItem={() => (
        <span className="truncate text-xs font-medium">
          {selected?.name ?? placeholder}
        </span>
      )}
    >
      {visible.map(o => (
        <BaseAutocompleteItem key={o.id} id={o.id} textValue={o.name}>
          {o.name}
        </BaseAutocompleteItem>
      ))}
    </BaseAutocomplete>
  );
};
