import {
  type HelpdeskContactListDto,
  searchContacts,
} from '@/api/local/tickets';
import {
  BaseAutocomplete,
  BaseAutocompleteItem,
} from '@brainforgeau/components';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { type FC, useEffect, useState } from 'react';

/** The contact a request is for: someone on file, or a new name to add. */
export type RequestContact =
  | { kind: 'existing'; contact: HelpdeskContactListDto }
  | { kind: 'new'; displayName: string };

const NEW_KEY = '__new__';

const useDebounced = <T,>(value: T, ms: number): T => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
};

interface ContactPickerProps {
  value: RequestContact | null;
  onChange: (contact: RequestContact | null) => void;
  /** The chosen company and organisation, which the search is scoped to. */
  scopeKey: string;
  /** Token for that scope; undefined when it is the app's own context. */
  scopeToken?: string;
  /** False while a token for the chosen scope is still being issued. */
  isReady: boolean;
}

/**
 * Staff raising a request for a client pick the client's contact. The search
 * runs on the server, in the chosen company, and nothing is fetched until the
 * list opens. When nobody matches, the last row offers to add the typed name
 * as a new contact.
 */
export const ContactPicker: FC<ContactPickerProps> = ({
  value,
  onChange,
  scopeKey,
  scopeToken,
  isReady,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const term = useDebounced(query.trim(), 250);

  const { data: contacts = [], isFetching } = useQuery({
    queryKey: ['new-request', 'contacts', scopeKey, term],
    enabled: isOpen && isReady,
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
    queryFn: () => searchContacts(term, scopeToken),
  });

  const typed = query.trim();
  const exact = contacts.some(
    c => c.displayName.toLowerCase() === typed.toLowerCase(),
  );
  const selectedKey =
    value?.kind === 'existing'
      ? value.contact.id
      : value?.kind === 'new'
        ? NEW_KEY
        : null;
  const selectedLabel =
    value?.kind === 'existing'
      ? value.contact.displayName
      : value?.kind === 'new'
        ? value.displayName
        : '';

  return (
    <BaseAutocomplete
      label="Contact name"
      placeholder="Choose a contact"
      className="w-full"
      selectedKey={selectedKey}
      onSelectionChange={key => {
        if (key === NEW_KEY) {
          if (typed) onChange({ kind: 'new', displayName: typed });
          return;
        }
        const picked = contacts.find(c => c.id === key);
        onChange(picked ? { kind: 'existing', contact: picked } : null);
      }}
      onValueChange={setQuery}
      onOpenChange={open => {
        setIsOpen(open);
        if (!open) setQuery('');
      }}
      renderSelectedItem={() => (
        <span className="truncate text-xs font-medium">{selectedLabel}</span>
      )}
    >
      {[
        ...contacts.map(c => (
          <BaseAutocompleteItem key={c.id} id={c.id} textValue={c.displayName}>
            <div className="flex flex-col">
              <span className="text-xs font-medium">{c.displayName}</span>
              <span className="text-light-gray text-[11px]">{c.email}</span>
            </div>
          </BaseAutocompleteItem>
        )),
        ...(typed && !exact && !isFetching
          ? [
              <BaseAutocompleteItem
                key={NEW_KEY}
                id={NEW_KEY}
                textValue={`Add ${typed} as new contact`}
              >
                <span className="text-blue text-xs">
                  Add "{typed}" as new contact
                </span>
              </BaseAutocompleteItem>,
            ]
          : []),
      ]}
    </BaseAutocomplete>
  );
};
