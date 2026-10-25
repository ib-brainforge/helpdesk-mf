import type { CompanyDeadlinePolicyDto } from '@/api/local/company-deadlines';
import { DurationInput, StatusBadge } from '@/components/shared';
import { formatMinutes } from '@/components/shared/deadline';
import { getPriorityConfig } from '@/components/tickets/ticket-priority-config';
import type { TicketPriority } from '@/types/ticket';
import type { FC } from 'react';
import { PRIORITIES } from '../deadlinePolicy';

interface TargetCellProps {
  label: string;
  minutes: number;
  /** The saved value, shown struck through once the field is changed. */
  savedMinutes?: number;
  onChange: (minutes: number) => void;
  onBlur: () => void;
  error?: string;
}

/**
 * One duration field, and a fixed slot after it for the saved value. The
 * slot is always there, so changing one row never shifts the columns.
 */
const TargetCell: FC<TargetCellProps> = ({
  label,
  minutes,
  savedMinutes,
  onChange,
  onBlur,
  error,
}) => {
  const changed = savedMinutes !== undefined && savedMinutes !== minutes;
  return (
    <div className="flex items-start gap-2">
      <DurationInput
        label={label}
        value={minutes}
        onChange={onChange}
        onBlur={onBlur}
        error={error}
        className="w-32"
      />
      <span
        className="text-default-500 w-14 shrink-0 pt-1.5 text-xs whitespace-nowrap"
        aria-hidden={!changed}
      >
        {changed && (
          <>
            <span className="sr-only">Was </span>
            <s>{formatMinutes(savedMinutes)}</s>
          </>
        )}
      </span>
    </div>
  );
};

const firstError = (errors: unknown[]): string | undefined => {
  const e = errors[0];
  if (!e) return undefined;
  if (typeof e === 'string') return e;
  return (e as { message?: string }).message;
};

interface TargetsSectionProps {
  // biome-ignore lint/suspicious/noExplicitAny: useEntityForm exposes the TanStack form untyped
  form: any;
  saved?: CompanyDeadlinePolicyDto;
  companyName: string;
}

/** "Deadlines by priority": reply and fix targets, in business time. */
export const TargetsSection: FC<TargetsSectionProps> = ({
  form,
  saved,
  companyName,
}) => (
  <section>
    <h2 className="text-dark text-base font-semibold dark:text-white">
      Deadlines by priority
    </h2>
    <p className="text-gray mt-1 text-sm dark:text-light">
      New tickets for {companyName} get their due dates from these. Type a time
      like 30 min or 4 h.
    </p>
    <div className="border-default-200 mt-4 overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-default-50 text-default-600 text-left text-xs font-semibold">
          <tr>
            <th className="px-3 py-2.5">Priority</th>
            <th className="px-3 py-2.5">Reply by</th>
            <th className="px-3 py-2.5">Fix by</th>
          </tr>
        </thead>
        <tbody>
          {PRIORITIES.map((priority, i) => {
            const config = getPriorityConfig(priority as TicketPriority);
            const savedTarget = saved?.targets.find(
              t => t.priority === priority,
            );
            return (
              <tr key={priority} className="border-default-200 border-t">
                <td className="px-3 py-2">
                  <StatusBadge color={config.color}>{config.label}</StatusBadge>
                </td>
                {(['replyMinutes', 'fixMinutes'] as const).map(field => (
                  <td key={field} className="px-3 py-2 align-top">
                    <form.Field name={`targets[${i}].${field}`}>
                      {/* biome-ignore lint/suspicious/noExplicitAny: untyped form field */}
                      {(f: any) => (
                        <TargetCell
                          label={`${priority} ${field === 'replyMinutes' ? 'reply by' : 'fix by'}`}
                          minutes={f.state.value}
                          savedMinutes={savedTarget?.[field]}
                          onChange={f.handleChange}
                          onBlur={f.handleBlur}
                          error={firstError(f.state.meta.errors)}
                        />
                      )}
                    </form.Field>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </section>
);
