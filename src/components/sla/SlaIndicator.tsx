import type { TicketDeadlineDto } from '@/api/local/deadlines';
import {
  DeadlineChip,
  formatDeadlineDateTime,
  formatDeadlineSentence,
  formatDuration,
  sanitiseDeadline,
} from '@/components/shared/deadline';
import { Icon } from '@brainforgeau/components/base';
import { useTimezone } from '@brainforgeau/security';
import type { FC } from 'react';

interface SlaIndicatorProps {
  /** The ticket's deadlines, from the ticket itself (no separate request). */
  deadline: TicketDeadlineDto;
  /** When the ticket was raised, for "Met in 24 min". */
  createdAt?: string | null;
  /** The ticket's company, for the policy line ("Harbour Logistics, High priority"). */
  companyName?: string | null;
  /** The ticket's organisation, for an organisation's own policy. */
  organisationName?: string | null;
  /** The ticket is Closed, for one closed without a resolved time. */
  isClosed?: boolean;
}

const minutesBetween = (from: string, to: string) =>
  (new Date(to).getTime() - new Date(from).getTime()) / 60_000;

/**
 * The ticket's deadline block: where it stands, the first reply and the fix,
 * and the company policy that set them.
 *
 * Everything comes from the backend's deadline instants and its policy text;
 * nothing here works out business hours. The clock never pauses, so there is
 * no paused state.
 */
export const SlaIndicator: FC<SlaIndicatorProps> = ({
  deadline: rawDeadline,
  createdAt,
  companyName,
  organisationName,
  isClosed,
}) => {
  const timezone = useTimezone();
  // An impossible date (year 1) reads as "No target", not as a due date.
  const deadline = sanitiseDeadline(rawDeadline);
  const { policy } = deadline;

  // Whose policy set these deadlines: the organisation's own, the company's,
  // or the defaults.
  const owner =
    policy?.source === 'Organisation'
      ? (organisationName ?? companyName)
      : policy?.source === 'Company'
        ? companyName
        : null;
  const policyOwner = owner ? `${owner}'s deadlines` : 'Default deadlines';

  const replyRow = (() => {
    if (deadline.repliedAt) {
      const onTime =
        !deadline.replyDueAt || deadline.repliedAt <= deadline.replyDueAt;
      const took =
        createdAt && minutesBetween(createdAt, deadline.repliedAt) >= 0
          ? ` in ${formatDuration(minutesBetween(createdAt, deadline.repliedAt))}`
          : '';
      return (
        <span
          className={`flex items-center gap-1 font-semibold ${
            onTime ? 'text-green-700' : 'text-danger'
          }`}
        >
          <Icon name={onTime ? 'check' : 'warning'} className="h-3.5 w-3.5" />
          {onTime ? `Met${took}` : `Missed, replied${took}`}
        </span>
      );
    }
    return deadline.replyDueAt ? (
      <span>{formatDeadlineDateTime(deadline.replyDueAt, timezone)}</span>
    ) : (
      <span className="text-default-400">No target</span>
    );
  })();

  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-default-700">Deadline</span>
        {/* Live chip while open; Met, Late by or No deadline once finished,
          from the same helper as the list's Deadline cell. */}
        <DeadlineChip deadline={deadline} isClosed={isClosed} showNone />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-default-600">Time to first reply</span>
        {replyRow}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-default-600">Fix by</span>
        <span className="font-medium">
          {deadline.fixDueAt
            ? formatDeadlineDateTime(deadline.fixDueAt, timezone)
            : 'No target'}
        </span>
      </div>
      {policy && (
        <div className="rounded-[3px] bg-default-100 px-3 py-2 text-xs">
          <p className="font-semibold text-foreground">{policyOwner}</p>
          <p className="text-default-600">
            {formatDeadlineSentence(policy, policy.hoursText)}
          </p>
        </div>
      )}
    </div>
  );
};
