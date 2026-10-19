import { BaseAvatar } from '@brainforgeau/components';

interface UserOptionRowProps {
  name: string;
  email?: string;
  avatarUrl?: string;
  /**
   * Tickets this person currently has open (any status but Closed). Shown as a
   * trailing badge so a picker doubles as a workload view: assigning is a
   * decision about who has capacity, and that number is the whole basis for it.
   * Omit to render no badge; 0 renders as 0, which is meaningful here.
   */
  openTicketCount?: number;
}

/**
 * One person in a user picker: avatar, name, email underneath.
 *
 * WHY SHARED: this markup was copy-pasted into five pickers (the assignee
 * filter, bulk assign, the new-ticket form and modal, and the ticket detail
 * sidebar). All five carried the same bug, and they had already drifted on
 * colour: two used the `text-gray` token while three hardcoded #59636E and
 * #8C8F97.
 *
 * THE BUG: the text column was `flex-1` with no `min-w-0`. A flex child
 * defaults to `min-width: auto`, so it refuses to shrink below its content and
 * a long email ("kim-tenant@netcorp.com.au") wrapped onto a second line and
 * was then clipped by the popover, leaving a torn half-line of text.
 *
 * `min-w-0` lets the column shrink; `truncate` then clips cleanly with an
 * ellipsis. The email keeps its full value in the title, since an address is
 * exactly the kind of thing someone needs in full.
 */
export const UserOptionRow: React.FC<UserOptionRowProps> = ({
  name,
  email,
  avatarUrl,
  openTicketCount,
}) => (
  <div className="flex items-center gap-2.5">
    <BaseAvatar src={avatarUrl} name={name} size="xs" />
    <div className="min-w-0 flex-1">
      <span className="text-gray block truncate text-xs dark:text-white">
        {name}
      </span>
      {email && (
        <span
          className="text-light-gray dark:text-light block truncate text-[10px]"
          title={email}
        >
          {email}
        </span>
      )}
    </div>
    {openTicketCount !== undefined && (
      <span
        className="bg-lighter-blue text-blue ml-auto flex-shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums"
        title={`${openTicketCount} open ticket${openTicketCount === 1 ? '' : 's'}`}
      >
        {openTicketCount}
      </span>
    )}
  </div>
);
