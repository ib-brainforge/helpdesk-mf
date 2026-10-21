import type { DeadlineDifferenceDto } from '@/api/local/company-deadlines';
import { overdueTicketsHref } from '@/components/tickets/hooks/ticketListUrl';
import { NavLink } from '@modern-js/runtime/router';
import type { FC } from 'react';
import { describeDifference } from '../resolveDeadlines';

/*
 * The cells the tenants list and a tenant's organisations share, so both
 * say "custom" and "late" the same way.
 */

/** Late counts, in both themes (red-dark is too dark on the dark surface). */
export const LATE_TEXT = 'text-red-dark dark:text-red-400';

/** Rows shown before "and N more", so a row stays one glance tall. */
const SHOWN = 3;

/**
 * What differs from what it would otherwise use, or "Same as default" when
 * nothing does: "Critical fix 2 h (default 4 h)". The value here is bold,
 * the inherited one muted.
 */
export const DeadlineDifferences: FC<{
  differences: DeadlineDifferenceDto[];
  /** "default", "Remondis". */
  fromName: string;
}> = ({ differences, fromName }) => {
  if (differences.length === 0)
    return <span className="text-default-500 text-sm">Same as {fromName}</span>;
  const shown = differences.slice(0, SHOWN);
  const more = differences.length - shown.length;
  return (
    <ul className="space-y-0.5 text-sm">
      {shown.map(d => {
        const { label, value, inherited } = describeDifference(d);
        return (
          <li key={`${d.field}-${'priority' in d ? d.priority : ''}`}>
            <span className="text-default-600">{label} </span>
            <strong className="text-dark font-semibold dark:text-white">
              {value}
            </strong>
            <span className="text-default-500">
              {' '}
              ({fromName} {inherited})
            </span>
          </li>
        );
      })}
      {more > 0 && (
        <li className="text-default-500">
          and {more} more difference{more === 1 ? '' : 's'}
        </li>
      )}
    </ul>
  );
};

/** Late open tickets, linking to the Overdue tab filtered to them. */
export const LateCount: FC<{
  late: number;
  tenantId: string;
  organisationId?: string | null;
  name: string;
}> = ({ late, tenantId, organisationId, name }) =>
  late > 0 ? (
    <NavLink
      to={overdueTicketsHref(tenantId, organisationId)}
      aria-label={`${late} late tickets for ${name}`}
      className={`${LATE_TEXT} block text-right text-sm font-semibold tabular-nums hover:underline`}
    >
      {late}
    </NavLink>
  ) : (
    <span className="text-default-400 block text-right text-sm tabular-nums">
      0
    </span>
  );
