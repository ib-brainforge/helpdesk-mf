import type { CompanyDeadlinePolicyDto } from '@/api/local/company-deadlines';
import { StatusBadge } from '@/components/shared';
import { getPriorityConfig } from '@/components/tickets/ticket-priority-config';
import type { TicketPriority } from '@/types/ticket';
import {
  BaseNumberInput,
  BaseSelect,
  BaseSelectItem,
} from '@brainforgeau/components';
import { type FC, useEffect, useState } from 'react';
import {
  PRIORITIES,
  type TargetUnit,
  UNIT_MINUTES,
  formatTargetMinutes,
  unitFor,
} from '../deadlinePolicy';

interface TargetCellProps {
  label: string;
  minutes: number;
  /** The saved value, struck through beside the field once it is changed. */
  savedMinutes?: number;
  onChange: (minutes: number) => void;
  onBlur: () => void;
  error?: string;
}

/**
 * A number and its unit. The form holds minutes; the unit is how the person
 * thinks about the number, so it is kept here and only re-derived when the
 * value can no longer be shown in it (after Reset, say).
 */
const TargetCell: FC<TargetCellProps> = ({
  label,
  minutes,
  savedMinutes,
  onChange,
  onBlur,
  error,
}) => {
  const [unit, setUnit] = useState<TargetUnit>(() => unitFor(minutes));
  useEffect(() => {
    if (minutes % UNIT_MINUTES[unit] !== 0) setUnit('minutes');
  }, [minutes, unit]);

  const factor = UNIT_MINUTES[unit];
  const changed = savedMinutes !== undefined && savedMinutes !== minutes;

  return (
    <div>
      <div className="flex items-center gap-2">
        <BaseNumberInput
          aria-label={label}
          size="sm"
          className="w-20"
          minValue={1}
          value={Number.isFinite(minutes) ? minutes / factor : undefined}
          onValueChange={v =>
            onChange(v === undefined ? Number.NaN : v * factor)
          }
          onBlur={onBlur}
          isInvalid={Boolean(error)}
        />
        <BaseSelect
          aria-label={`${label} unit`}
          size="sm"
          className="w-28"
          selectedKey={unit}
          onSelectionChange={key => {
            const next = (key as TargetUnit) ?? unit;
            if (next === unit) return;
            // Keep the number, change what it means: "4" minutes becomes "4" hours.
            const shown = minutes / factor;
            setUnit(next);
            if (Number.isFinite(shown)) onChange(shown * UNIT_MINUTES[next]);
          }}
        >
          <BaseSelectItem key="minutes" id="minutes">
            minutes
          </BaseSelectItem>
          <BaseSelectItem key="hours" id="hours">
            hours
          </BaseSelectItem>
        </BaseSelect>
        {changed && (
          <span className="text-default-400 whitespace-nowrap text-xs line-through">
            {formatTargetMinutes(savedMinutes)}
          </span>
        )}
      </div>
      {error && <p className="text-danger mt-1 text-xs">{error}</p>}
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
      New tickets for {companyName} get their due dates from these, counted in
      business hours.
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
