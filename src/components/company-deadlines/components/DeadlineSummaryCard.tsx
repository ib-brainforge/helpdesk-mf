import type { CompanyDeadlinePolicyDto } from '@/api/local/company-deadlines';
import {
  describeClock,
  formatDeadlineSentence,
} from '@/components/shared/deadline';
import type { FC, ReactNode } from 'react';
import { PRIORITIES } from '../deadlinePolicy';

/*
 * A policy read in plain sentences, one per priority and one for the clock.
 * Every tenant's page while it is not being edited: the values in force are
 * only ever shown here, never in a greyed-out form.
 */

interface DeadlineSummaryCardProps {
  title: ReactNode;
  description?: ReactNode;
  policy: CompanyDeadlinePolicyDto;
  /** Edit, Use provider default. */
  actions?: ReactNode;
}

export const DeadlineSummaryCard: FC<DeadlineSummaryCardProps> = ({
  title,
  description,
  policy,
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
      {PRIORITIES.flatMap(priority => {
        const t = policy.targets.find(x => x.priority === priority);
        return t
          ? [
              <li key={priority} className="py-2 text-default-700">
                {formatDeadlineSentence({
                  ...t,
                  clockMode: policy.clockMode,
                })}
              </li>,
            ]
          : [];
      })}
      <li className="py-2 text-default-700">
        <span className="text-default-500">Clock: </span>
        {describeClock(policy)}
      </li>
    </ul>
  </section>
);
