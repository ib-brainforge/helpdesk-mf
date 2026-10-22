import type { DeadlineDifferenceDto } from '@/api/local/company-deadlines';
import {
  formatDeadlineSentence,
  formatMinutes,
} from '@/components/shared/deadline';
import type { FC, ReactNode } from 'react';
import type { ResolvedDeadlines } from '../resolveDeadlines';

/*
 * A policy read in plain sentences, one per priority and one for the clock,
 * with where each comes from. The Default card on the list, and every policy
 * page while it is not being edited (inherited values are only ever shown
 * here, never in a greyed-out form).
 */

const tagBase = 'whitespace-nowrap text-xs';

/** "From Remondis", "Same as default", or what it overrides. */
const SourceTag: FC<{
  resolved: ResolvedDeadlines;
  differs: boolean;
  /** The inherited value, for "default: 4 h". */
  was?: string;
}> = ({ resolved, differs, was }) => {
  if (!resolved.hasOwn)
    return (
      <span
        className={`${tagBase} bg-default-100 text-default-700 rounded-full px-2 py-0.5 font-medium`}
      >
        From {resolved.fromName}
      </span>
    );
  if (!differs)
    return (
      <span className={`${tagBase} text-default-500`}>
        Same as {resolved.fromName}
      </span>
    );
  return (
    <span className={`${tagBase} text-default-500`}>
      <strong className="text-dark font-semibold dark:text-white">Own</strong>
      {was && (
        <>
          , {resolved.fromName}: {was}
        </>
      )}
    </span>
  );
};

/** "reply 1 h, fix 8 h": the inherited targets one priority overrides. */
const wasTargets = (
  differences: DeadlineDifferenceDto[],
  priority: string,
): string =>
  differences
    .flatMap(d =>
      (d.field === 'reply' || d.field === 'fix') && d.priority === priority
        ? [`${d.field} ${formatMinutes(d.inherited)}`]
        : [],
    )
    .join(', ');

interface DeadlineSummaryCardProps {
  title: ReactNode;
  description?: ReactNode;
  resolved: ResolvedDeadlines;
  /** The default has nothing above it, so no source tags. */
  isDefault?: boolean;
  /** Edit, Set own deadlines, Use X's deadlines. */
  actions?: ReactNode;
}

export const DeadlineSummaryCard: FC<DeadlineSummaryCardProps> = ({
  title,
  description,
  resolved,
  isDefault = false,
  actions,
}) => (
  <section className="border-default-200 bg-content1 rounded-md border">
    <header className="border-default-200 flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3">
      <div>
        <h2 className="text-dark text-base font-semibold dark:text-white">
          {title}
        </h2>
        {description && (
          <p className="text-default-600 mt-0.5 text-sm">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
    <ul className="divide-default-200 divide-y px-4 text-sm">
      {resolved.rows.map(row => (
        <li
          key={row.priority}
          className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2"
        >
          <span className="text-default-700">
            {formatDeadlineSentence({ ...row, clockMode: resolved.clockMode })}
          </span>
          {!isDefault && (
            <SourceTag
              resolved={resolved}
              differs={row.differs}
              was={wasTargets(resolved.differences, row.priority)}
            />
          )}
        </li>
      ))}
      <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2">
        <span className="text-default-700">
          <span className="text-default-500">Clock: </span>
          {resolved.clock}
        </span>
        {!isDefault && (
          <SourceTag resolved={resolved} differs={resolved.clockDiffers} />
        )}
      </li>
    </ul>
  </section>
);
