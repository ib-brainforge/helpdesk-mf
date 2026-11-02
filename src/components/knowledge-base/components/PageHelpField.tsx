import { RecipientTagInput } from '@brainforgeau/components';
import type { FC } from 'react';

import {
  MAX_PAGE_KEYS,
  PAGE_KEY_EXAMPLE_HINT,
  normalisePageKey,
  validatePageKey,
} from '../pageKeys';

interface PageHelpFieldProps {
  value: string[];
  onChange: (value: string[]) => void;
  /** Error from the form schema or the backend (list-level problems). */
  errorMessage?: string;
  /** Staff section of the selected category; undefined when none is selected. */
  categoryStaffSection?: string;
}

export const PageHelpField: FC<PageHelpFieldProps> = ({
  value,
  onChange,
  errorMessage,
  categoryStaffSection,
}) => {
  const showSectionHint = value.length > 0 && categoryStaffSection !== 'Help';

  return (
    <div className="flex flex-col gap-1 md:col-span-2">
      <RecipientTagInput
        label="Page help"
        placeholder="Add a page key and press Enter"
        description={`${PAGE_KEY_EXAMPLE_HINT} Up to ${MAX_PAGE_KEYS}. The article shows as page help only in a category whose staff section is Help.`}
        value={value}
        onChange={onChange}
        normalise={normalisePageKey}
        validate={validatePageKey}
      />
      {errorMessage && (
        <p className="text-sm text-danger" role="alert">
          {errorMessage}
        </p>
      )}
      {showSectionHint && (
        <p className="text-sm text-warning">
          {categoryStaffSection
            ? 'This article’s category is not shown to staff as Help, so it will not appear as page help. Set the category’s staff section to Help in the knowledge base settings.'
            : 'Choose a category whose staff section is Help, or the article will not appear as page help.'}
        </p>
      )}
    </div>
  );
};
