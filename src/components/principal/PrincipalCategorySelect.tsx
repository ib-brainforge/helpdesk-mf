import { usePrincipalCategories } from '@/hooks/usePrincipalCategories';
import { BaseSelect, BaseSelectItem } from '@brainforgeau/components';
import type { FC } from 'react';

interface PrincipalCategorySelectProps {
  principalId: string;
  /** The chosen category id; empty while none is chosen. */
  value: string;
  onChange: (categoryId: string) => void;
  isInvalid?: boolean;
  errorMessage?: string;
}

/**
 * The required Category for a ticket raised in the principal console: a
 * ticket cannot exist without one. Lists the principal's active categories.
 */
export const PrincipalCategorySelect: FC<PrincipalCategorySelectProps> = ({
  principalId,
  value,
  onChange,
  isInvalid,
  errorMessage,
}) => {
  const { data: categories = [] } = usePrincipalCategories(principalId);
  return (
    <BaseSelect
      label="Category"
      isRequired
      placeholder="Choose a category"
      selectedKey={value || null}
      onSelectionChange={key => {
        if (typeof key === 'string' && key) onChange(key);
      }}
      isInvalid={isInvalid}
      errorMessage={errorMessage}
    >
      {categories
        .filter(c => !!c.id)
        .map(c => (
          <BaseSelectItem key={c.id as string} value={c.id as string}>
            {c.name ?? 'Unnamed category'}
          </BaseSelectItem>
        ))}
    </BaseSelect>
  );
};
