import { BaseAutocompleteItem } from '@brainforgeau/components';

export const MORE_ASSIGNEES_ID = '__more__';
export const MORE_ASSIGNEES_TEXT = 'More people match, type to narrow';

/**
 * The disabled last row of an assignee list that shows only one page. A
 * function, not a component: collection items must be direct children.
 */
export const moreAssigneesItem = () => (
  <BaseAutocompleteItem
    key={MORE_ASSIGNEES_ID}
    id={MORE_ASSIGNEES_ID}
    textValue={MORE_ASSIGNEES_TEXT}
    isDisabled
  >
    <span className="text-light-gray text-[11px]">{MORE_ASSIGNEES_TEXT}</span>
  </BaseAutocompleteItem>
);
