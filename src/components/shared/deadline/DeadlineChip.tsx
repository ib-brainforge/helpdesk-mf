import type { TicketDeadlineDto } from '@/api/local/deadlines';
import { useTimezone } from '@/security';
import { Icon } from '@brainforgeau/components/base';
import type { FC } from 'react';
import {
  type DeadlineOutcome,
  type DeadlineState,
  formatDeadlineDateTime,
  formatDeadlineLabel,
  formatDuration,
  formatShortDate,
  getDeadlineOutcome,
  getDeadlineState,
  getNextTarget,
} from './deadline';
import { useMinuteTick } from './useMinuteTick';

/*
 * Three states only: On track, Due soon, Overdue. The clock never pauses while
 * waiting on the client, so there is no "On hold".
 */
const STATE_CLASSES: Record<DeadlineState, string> = {
  onTrack: 'bg-[#f5f5f5] text-[#59636e] shadow-[inset_0_0_0_1px_#d1d9e0]',
  dueSoon: 'bg-[#f8e6a0] text-[#7f5f01]',
  overdue: 'bg-[#ae2e24] text-white',
};

const STATE_NAMES: Record<DeadlineState, string> = {
  onTrack: 'On track',
  dueSoon: 'Due soon',
  overdue: 'Overdue',
};

export interface DeadlineStateChipProps {
  state: DeadlineState;
  /** The words beside the clock, e.g. "Fix in 1h 42m" or "3h 20m". */
  label: string;
  /** Native tooltip; defaults to the state's name. */
  title?: string;
  className?: string;
}

/**
 * The chip itself, with no data behind it: a state and the words to show.
 * Use it where there is no ticket, such as a legend.
 */
export const DeadlineStateChip: FC<DeadlineStateChipProps> = ({
  state,
  label,
  title,
  className = '',
}) => (
  <span
    title={title ?? STATE_NAMES[state]}
    className={`inline-flex h-[18px] max-w-full shrink-0 items-center gap-1 whitespace-nowrap rounded-[2px] px-1.5 text-xs font-semibold leading-none ${STATE_CLASSES[state]} ${className}`}
  >
    <Icon name="clock" className="h-3 w-3 shrink-0" />
    <span className="truncate">{label}</span>
  </span>
);

export interface DeadlineOutcomeLabelProps {
  outcome: DeadlineOutcome;
  /** The word for how it ended: "Closed" or "Resolved". */
  closedWord?: string;
  className?: string;
}

/**
 * How a finished ticket did, muted so it never competes with the live
 * deadlines around it: a green check and "Met", a muted red "Late by 2d",
 * a grey "No deadline", or just "Closed" when there is no resolved time.
 * The date it closed sits underneath in small grey text.
 */
export const DeadlineOutcomeLabel: FC<DeadlineOutcomeLabelProps> = ({
  outcome,
  closedWord = 'Closed',
  className = '',
}) => {
  const timezone = useTimezone();
  const closedAt = 'closedAt' in outcome ? outcome.closedAt : null;
  const when = closedAt
    ? `${closedWord} ${formatShortDate(closedAt, timezone)}`
    : null;
  const title = closedAt
    ? `${closedWord} ${formatDeadlineDateTime(closedAt, timezone)}`
    : undefined;
  const main =
    outcome.kind === 'met' ? (
      <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-400">
        <Icon name="CheckCircleIcon" className="h-3.5 w-3.5 shrink-0" />
        Met
      </span>
    ) : outcome.kind === 'late' ? (
      <span className="text-[#ae2e24]/80 dark:text-red-400">
        Late by {formatDuration(outcome.lateMinutes)}
      </span>
    ) : outcome.kind === 'none' ? (
      <span className="text-default-400 dark:text-white/55">No deadline</span>
    ) : (
      <span className="text-default-500 dark:text-white/65">{closedWord}</span>
    );
  return (
    <span
      title={title}
      className={`inline-flex flex-col text-xs leading-tight ${className}`}
    >
      <span className="font-medium">{main}</span>
      {when && outcome.kind !== 'closed' && (
        <span className="text-default-400 text-[11px] dark:text-white/60">
          {when}
        </span>
      )}
    </span>
  );
};

export interface DeadlineChipProps {
  deadline: TicketDeadlineDto | null | undefined;
  /**
   * The ticket is Closed. A finished ticket shows how it did against its
   * deadline instead of a live chip; this covers one with no resolved time.
   */
  isClosed?: boolean;
  /** Say "No deadline" for an open ticket without one, rather than nothing. */
  showNone?: boolean;
  /** Fixed "now" in ms, for tests and static renders. Defaults to the shared clock. */
  now?: number;
  className?: string;
}

/**
 * A ticket's next deadline: the first reply until there is one, then the fix.
 * A finished ticket shows its outcome (Met, Late by, No deadline) instead.
 * Renders nothing for an open ticket without a deadline.
 */
export const DeadlineChip: FC<DeadlineChipProps> = ({
  deadline,
  isClosed,
  showNone = false,
  now,
  className,
}) => {
  const tick = useMinuteTick();
  const timezone = useTimezone();
  const at = now ?? tick;
  const outcome = getDeadlineOutcome(deadline, isClosed);
  if (outcome)
    return <DeadlineOutcomeLabel outcome={outcome} className={className} />;
  const state = getDeadlineState(deadline, at);
  const target = getNextTarget(deadline);
  if (!state || !target)
    return showNone ? (
      <DeadlineOutcomeLabel
        outcome={{ kind: 'none', closedAt: null }}
        className={className}
      />
    ) : null;
  const due = formatDeadlineDateTime(target.dueAt, timezone);
  return (
    <DeadlineStateChip
      state={state}
      label={formatDeadlineLabel(deadline, at, timezone)}
      title={`${STATE_NAMES[state]}. ${target.kind === 'reply' ? 'Reply' : 'Fix'} due ${due}`}
      className={className}
    />
  );
};
