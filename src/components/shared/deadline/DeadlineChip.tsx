import type { TicketDeadlineDto } from '@/api/local/deadlines';
import { useTimezone } from '@/security';
import { Icon } from '@brainforgeau/components/base';
import type { FC } from 'react';
import {
  type DeadlineState,
  formatDeadlineDateTime,
  formatDeadlineLabel,
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

export interface DeadlineChipProps {
  deadline: TicketDeadlineDto | null | undefined;
  /** Fixed "now" in ms, for tests and static renders. Defaults to the shared clock. */
  now?: number;
  className?: string;
}

/**
 * A ticket's next deadline: the first reply until there is one, then the fix.
 * Renders nothing for a fixed ticket or one without a deadline.
 */
export const DeadlineChip: FC<DeadlineChipProps> = ({
  deadline,
  now,
  className,
}) => {
  const tick = useMinuteTick();
  const timezone = useTimezone();
  const at = now ?? tick;
  const state = getDeadlineState(deadline, at);
  const target = getNextTarget(deadline);
  if (!state || !target) return null;
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
