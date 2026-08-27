import { BaseAvatar, Icon } from '@brainforgeau/components';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownTrigger,
} from '@heroui/react';
import { useAtom } from 'jotai';
import { type FC, useMemo, useState } from 'react';
import {
  mapUserToOption,
  usersMutationAtom,
} from '../state/users-dropdown-state';

interface QuickAssignCellProps {
  ticketId: string;
  /** Signed in user, so "Assign to me" can be offered first. */
  currentUserId?: string;
  onAssign: (ticketId: string, assigneeId: string) => void;
}

/**
 * Turns the "Unassigned" label in the grid into the control that assigns it.
 *
 * Assigning used to mean opening the row's ⋮ menu and answering a
 * window.prompt() that wanted a raw user GUID typed in by hand, which nobody
 * can do from memory. The word "Unassigned" was the most obvious place to
 * click and did nothing, so that is what now opens the picker.
 *
 * "Assign to me" is pinned to the top because taking a ticket yourself is the
 * common case and this makes it a single click, with no searching or reading
 * of a list. The rest of the team follows underneath.
 *
 * Users come from the same identity search the bulk assign modal uses, so
 * there is one source of truth for who is assignable. The list is fetched when
 * the menu opens rather than on render, so a grid of 25 rows does not fire 25
 * identity lookups for a menu nobody has opened.
 */
export const QuickAssignCell: FC<QuickAssignCellProps> = ({
  ticketId,
  currentUserId,
  onAssign,
}) => {
  const [hasLoaded, setHasLoaded] = useState(false);
  const [{ mutate: searchUsers, data: usersData, isPending }] =
    useAtom(usersMutationAtom);

  const options = useMemo(
    () => (usersData ?? []).map(mapUserToOption).filter(u => u.id),
    [usersData],
  );

  // Whoever is signed in is already offered as "Assign to me", so drop them
  // from the list below rather than showing the same person twice.
  const others = useMemo(
    () => options.filter(u => u.id !== currentUserId),
    [options, currentUserId],
  );

  return (
    <Dropdown
      onOpenChange={open => {
        if (open && !hasLoaded) {
          searchUsers({ query: '' });
          setHasLoaded(true);
        }
      }}
    >
      <DropdownTrigger>
        {/*
          A plain button, not BaseButton: BaseButton's variants resolve their
          own text colour and beat a className override, which is what made the
          row actions glyph render white on white. Stated once, here.
        */}
        <button
          type="button"
          aria-label="Assign this ticket"
          className="text-gray hover:bg-light-blue hover:text-blue focus:ring-blue -ml-1 flex items-center gap-1 rounded-md px-1.5 py-0.5 text-sm transition-colors focus:outline-none focus:ring-2"
        >
          <span className="text-muted-foreground">Unassigned</span>
          <Icon name="plus" className="h-3 w-3" />
        </button>
      </DropdownTrigger>
      <DropdownPopover className="helpdesk-dropdown-popover">
        <DropdownMenu aria-label="Assign ticket to">
          {currentUserId ? (
            <DropdownItem
              key="assign-to-me"
              onPress={() => onAssign(ticketId, currentUserId)}
            >
              Assign to me
            </DropdownItem>
          ) : null}
          {isPending ? (
            <DropdownItem key="loading" isDisabled>
              Loading team...
            </DropdownItem>
          ) : others.length === 0 ? (
            <DropdownItem key="empty" isDisabled>
              No other users found
            </DropdownItem>
          ) : (
            // Capped: this is the quick path, not a directory. Anyone further
            // down the list is reachable through the ticket itself or bulk
            // assign, both of which have a search box.
            others
              .slice(0, 15)
              .map(user => (
                <DropdownItem
                  key={user.id}
                  onPress={() => onAssign(ticketId, user.id)}
                  textValue={user.name}
                >
                  <div className="flex items-center gap-2">
                    <BaseAvatar
                      src={user.avatarUrl}
                      name={user.name}
                      size="xs"
                    />
                    <span className="truncate">{user.name}</span>
                  </div>
                </DropdownItem>
              ))
          )}
        </DropdownMenu>
      </DropdownPopover>
    </Dropdown>
  );
};
