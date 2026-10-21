import { BaseAvatar, Icon } from '@brainforgeau/components';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownTrigger,
} from '@heroui/react';
import { type FC, useMemo, useState } from 'react';
import { useScopedAssignees } from '../hooks/useScopedAssignees';

interface QuickAssignCellProps {
  ticketId: string;
  /** Signed in user, so "Assign to me" can be offered first. */
  currentUserId?: string;
  /**
   * The row's own scope, so the menu lists the people who can work THIS
   * ticket rather than whoever the viewer's context happens to name.
   */
  tenantId?: string | null;
  organisationId?: string | null;
  divisionId?: string | null;
  onAssign: (
    ticketId: string,
    assigneeId: string | null,
    assigneeName?: string | null,
  ) => void;
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
 * Users come from useScopedAssignees, the same source as the ticket sidebar and
 * bulk assign, so there is one answer to who is assignable: everyone whose
 * helpdesk role reaches the row's scope, plus anyone already holding tickets
 * there. It loads when the menu first opens rather than on render, so a grid of
 * 25 unassigned rows does not fire lookups for menus nobody has opened.
 */
export const QuickAssignCell: FC<QuickAssignCellProps> = ({
  ticketId,
  currentUserId,
  tenantId,
  organisationId,
  divisionId,
  onAssign,
}) => {
  const [hasOpened, setHasOpened] = useState(false);
  const { options, isLoading } = useScopedAssignees(
    { tenantId, organisationId, divisionId },
    { enabled: hasOpened },
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
        if (open) setHasOpened(true);
      }}
    >
      <DropdownTrigger
        aria-label="Assign this ticket"
        className="text-gray hover:bg-light-blue hover:text-blue focus:ring-blue -ml-1 flex items-center gap-1 rounded-md px-1.5 py-0.5 text-sm transition-colors focus:outline-none focus:ring-2"
      >
        <span className="text-muted-foreground">Unassigned</span>
        <Icon name="plus" className="h-3 w-3" />
      </DropdownTrigger>
      <DropdownPopover className="helpdesk-dropdown-popover">
        <DropdownMenu aria-label="Assign ticket to">
          {currentUserId ? (
            <DropdownItem
              key="assign-to-me"
              onPress={() => onAssign(ticketId, currentUserId, 'you')}
            >
              Assign to me
            </DropdownItem>
          ) : null}
          {isLoading ? (
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
                  onPress={() => onAssign(ticketId, user.id, user.name)}
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
