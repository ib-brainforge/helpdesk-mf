import type { DeadlinePriority } from '@/api/local/deadlines';
import {
  DeadlineStateChip,
  formatDeadlineDateTime,
  formatDuration,
} from '@/components/shared/deadline';
import { BaseSelect, BaseSelectItem } from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import { BaseDateTimePicker } from '@brainforgeau/components/date-picker';
import { Spinner } from '@heroui/react';
import { parseAbsolute, toZoned } from '@internationalized/date';
import { type FC, useMemo, useState } from 'react';
import {
  PRIORITIES,
  type PolicyFormValues,
  policyFormSchema,
  toPolicyInput,
} from '../deadlinePolicy';
import { useDeadlinePreview } from '../hooks/useCompanyDeadlines';

interface WorkedExampleProps {
  /** The policy as it stands: the form while editing, the saved one otherwise. */
  values: PolicyFormValues;
  /** Editing: say that the answer follows the fields. */
  live?: boolean;
  tenantId: string;
}

const ResultBox: FC<{ label: string; iso?: string | null; tz: string }> = ({
  label,
  iso,
  tz,
}) => (
  <div className="border-default-200 rounded-md border px-3 py-2">
    <div className="text-default-600 text-xs font-semibold">{label}</div>
    <div className="text-dark mt-0.5 text-lg font-semibold dark:text-white">
      {iso ? formatDeadlineDateTime(iso, tz) : ' '}
    </div>
  </div>
);

/**
 * "Check it with an example". Asks the backend what deadlines a ticket logged
 * at a given moment would get under the policy as it stands in the form, saved
 * or not. The page never works a deadline out itself: this is the same code
 * that will set the real ticket's due dates.
 */
export const WorkedExample: FC<WorkedExampleProps> = ({
  values,
  live = false,
  tenantId,
}) => {
  // Critical first, as everywhere else: the question people bring here.
  const [priority, setPriority] = useState<DeadlinePriority>('Critical');
  const [startAt, setStartAt] = useState(() => new Date().toISOString());

  // A draft that breaks the rules gets its errors beside the fields, not a
  // round trip that the server would refuse anyway.
  const request = useMemo(() => {
    if (!policyFormSchema.safeParse(values).success) return null;
    const { applyToOpenTickets: _, ...policy } = values;
    return {
      policy: toPolicyInput(policy),
      priority,
      startAt,
    };
  }, [values, priority, startAt]);

  const preview = useDeadlinePreview(tenantId, request);
  const tz = values.timeZoneId;
  const data = request ? preview.data : undefined;

  return (
    <section className="border-default-200 rounded-md border">
      <header className="border-default-200 flex items-center justify-between gap-3 border-b px-4 py-3">
        <h3 className="text-dark text-base font-semibold dark:text-white">
          Check it with an example
        </h3>
        {live && (
          <span className="bg-default-100 text-default-700 rounded-full px-2 py-0.5 text-[11px] font-medium">
            Updates as you type
          </span>
        )}
      </header>
      <div className="space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
          <BaseSelect
            label="Priority"
            selectedKey={priority}
            onSelectionChange={key =>
              key && setPriority(key as DeadlinePriority)
            }
          >
            {PRIORITIES.map(p => (
              <BaseSelectItem key={p} id={p} textValue={p}>
                {p}
              </BaseSelectItem>
            ))}
          </BaseSelect>
          <BaseDateTimePicker
            label="Logged on"
            granularity="minute"
            value={parseAbsolute(startAt, tz)}
            onChange={v => {
              if (v) setStartAt(toZoned(v, tz).toDate().toISOString());
            }}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <ResultBox label="Reply by" iso={data?.replyDueAt} tz={tz} />
          <ResultBox label="Fix by" iso={data?.fixDueAt} tz={tz} />
        </div>

        <div className="text-default-600 flex min-h-5 items-start gap-2 text-sm">
          {preview.isFetching ? (
            <Spinner size="sm" className="mt-0.5" />
          ) : (
            <Icon
              name="info"
              className="text-primary mt-0.5 h-4 w-4 shrink-0"
            />
          )}
          <span>
            {!request
              ? 'Fix the highlighted fields to see an example.'
              : preview.isError
                ? "Couldn't work out the example. Check the hours and targets."
                : (data?.explanation?.text ?? '')}
          </span>
        </div>

        <div className="border-default-200 flex flex-wrap items-center gap-2 border-t pt-3 text-sm">
          <span className="text-default-600">
            How tickets show a deadline (examples):
          </span>
          <DeadlineStateChip
            state="onTrack"
            label={`On track, ${formatDuration(200)}`}
          />
          <DeadlineStateChip
            state="dueSoon"
            label={`Due soon, ${formatDuration(12)}`}
          />
          <DeadlineStateChip
            state="overdue"
            label={`Overdue, ${formatDuration(120)}`}
          />
        </div>
      </div>
    </section>
  );
};
