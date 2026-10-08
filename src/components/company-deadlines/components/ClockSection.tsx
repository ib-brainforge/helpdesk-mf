import type { CompanyDeadlinePolicyDto } from '@/api/local/company-deadlines';
import {
  BaseSelect,
  BaseSelectItem,
  BaseToggle,
} from '@brainforgeau/components';
import { BaseButton } from '@brainforgeau/components/button';
import { type FC, useState } from 'react';
import {
  DAY_NAMES,
  DAY_ORDER,
  HOLIDAY_CALENDARS,
  TIME_OPTIONS,
  formatClock,
  formatIsoDay,
  timeZoneOptions,
} from '../deadlinePolicy';
import { HolidaysModal } from './HolidaysModal';

const CLOCK_MODES = [
  {
    key: 'BusinessHours',
    title: 'Business hours only',
    hint: 'Stops overnight, on weekends and public holidays',
  },
  {
    key: 'AllHours',
    title: 'All hours (24/7)',
    hint: 'For companies that pay for round the clock cover',
  },
] as const;

const firstError = (errors: unknown[]): string | undefined => {
  const e = errors[0];
  if (!e) return undefined;
  return typeof e === 'string' ? e : (e as { message?: string }).message;
};

// biome-ignore lint/suspicious/noExplicitAny: useEntityForm exposes the TanStack form untyped
type AnyForm = any;

const TimeSelect: FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  isInvalid?: boolean;
}> = ({ label, value, onChange, isInvalid }) => (
  <BaseSelect
    aria-label={label}
    size="sm"
    className="w-32"
    selectedKey={value}
    isInvalid={isInvalid}
    onSelectionChange={key => key && onChange(String(key))}
  >
    {TIME_OPTIONS.map(t => (
      <BaseSelectItem key={t} id={t} textValue={formatClock(t)}>
        {formatClock(t)}
      </BaseSelectItem>
    ))}
  </BaseSelect>
);

interface ClockSectionProps {
  form: AnyForm;
  saved?: CompanyDeadlinePolicyDto;
  principalId?: string;
}

/** "How the clock counts": business hours or all hours, the week, zone and holidays. */
export const ClockSection: FC<ClockSectionProps> = ({
  form,
  saved,
  principalId,
}) => {
  const [holidaysOpen, setHolidaysOpen] = useState(false);
  const year = new Date().getFullYear();

  return (
    <section>
      <h2 className="text-dark text-base font-semibold dark:text-white">
        How the clock counts
      </h2>
      <p className="text-gray mt-1 text-sm dark:text-light">
        Deadlines only count time inside these hours. The clock never pauses for
        anything else.
      </p>

      <form.Field name="clockMode">
        {(field: AnyForm) => (
          <fieldset className="mt-4 grid gap-3 sm:grid-cols-2">
            <legend className="sr-only">How the clock counts</legend>
            {CLOCK_MODES.map(mode => {
              const selected = field.state.value === mode.key;
              // The whole card is the target, as in the mockup; the radio
              // input inside keeps it a real radio for keyboards and readers.
              return (
                <label
                  key={mode.key}
                  className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors has-[:focus-visible]:ring-2 ${
                    selected
                      ? 'border-primary ring-primary ring-1'
                      : 'border-default-200 hover:border-default-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="clockMode"
                    value={mode.key}
                    checked={selected}
                    onChange={() => field.handleChange(mode.key)}
                    className="accent-primary mt-0.5 h-4 w-4 shrink-0"
                  />
                  <span>
                    <span className="block text-sm font-semibold">
                      {mode.title}
                    </span>
                    <span className="text-default-500 block text-xs">
                      {mode.hint}
                    </span>
                  </span>
                </label>
              );
            })}
          </fieldset>
        )}
      </form.Field>

      <form.Subscribe selector={(s: AnyForm) => s.values.clockMode}>
        {(clockMode: string) =>
          clockMode === 'BusinessHours' && (
            <>
              <div className="border-default-200 mt-4 overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-default-50 text-default-600 text-left text-xs font-semibold">
                    <tr>
                      <th className="px-3 py-2.5">Day</th>
                      <th className="px-3 py-2.5">Open</th>
                      <th className="px-3 py-2.5">From</th>
                      <th className="px-3 py-2.5">To</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DAY_ORDER.map((dayOfWeek, i) => (
                      <form.Subscribe
                        key={dayOfWeek}
                        selector={(s: AnyForm) => s.values.days[i]?.isOpen}
                      >
                        {(isOpen: boolean) => (
                          <tr
                            className={`border-default-200 border-t ${isOpen ? '' : 'bg-default-50 text-default-500'}`}
                          >
                            <td className="px-3 py-1.5">
                              {DAY_NAMES[dayOfWeek]}
                            </td>
                            <td className="px-3 py-1.5">
                              <form.Field name={`days[${i}].isOpen`}>
                                {(f: AnyForm) => (
                                  <BaseToggle
                                    aria-label={`Open on ${DAY_NAMES[dayOfWeek]}`}
                                    isSelected={f.state.value}
                                    onValueChange={f.handleChange}
                                  />
                                )}
                              </form.Field>
                            </td>
                            {isOpen ? (
                              <>
                                <td className="px-3 py-1.5">
                                  <form.Field name={`days[${i}].start`}>
                                    {(f: AnyForm) => (
                                      <TimeSelect
                                        label={`${DAY_NAMES[dayOfWeek]} from`}
                                        value={f.state.value}
                                        onChange={f.handleChange}
                                      />
                                    )}
                                  </form.Field>
                                </td>
                                <td className="px-3 py-1.5">
                                  <form.Field name={`days[${i}].end`}>
                                    {(f: AnyForm) => {
                                      const error = firstError(
                                        f.state.meta.errors,
                                      );
                                      return (
                                        <div>
                                          <TimeSelect
                                            label={`${DAY_NAMES[dayOfWeek]} to`}
                                            value={f.state.value}
                                            onChange={f.handleChange}
                                            isInvalid={Boolean(error)}
                                          />
                                          {error && (
                                            <p className="text-danger mt-1 text-xs">
                                              {error}
                                            </p>
                                          )}
                                        </div>
                                      );
                                    }}
                                  </form.Field>
                                </td>
                              </>
                            ) : (
                              <td className="px-3 py-1.5" colSpan={2}>
                                Closed
                              </td>
                            )}
                          </tr>
                        )}
                      </form.Subscribe>
                    ))}
                  </tbody>
                </table>
              </div>
              <form.Field name="days">
                {(f: AnyForm) => {
                  const error = firstError(f.state.meta.errors);
                  return error ? (
                    <p className="text-danger mt-1 text-xs">{error}</p>
                  ) : null;
                }}
              </form.Field>
            </>
          )
        }
      </form.Subscribe>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <form.Field name="timeZoneId">
          {(f: AnyForm) => (
            <BaseSelect
              label="Time zone"
              selectedKey={f.state.value}
              onSelectionChange={key => key && f.handleChange(String(key))}
            >
              {timeZoneOptions(f.state.value).map(o => (
                <BaseSelectItem key={o.id} id={o.id} textValue={o.label}>
                  {o.label}
                </BaseSelectItem>
              ))}
            </BaseSelect>
          )}
        </form.Field>
        <form.Subscribe selector={(s: AnyForm) => s.values.clockMode}>
          {(clockMode: string) =>
            clockMode === 'BusinessHours' && (
              <form.Field name="holidayCalendar">
                {(f: AnyForm) => (
                  <BaseSelect
                    label="Public holidays"
                    selectedKey={f.state.value}
                    onSelectionChange={key =>
                      key && f.handleChange(String(key))
                    }
                  >
                    {HOLIDAY_CALENDARS.map(c => (
                      <BaseSelectItem
                        key={c.key}
                        id={c.key}
                        textValue={c.label}
                      >
                        {c.label}
                      </BaseSelectItem>
                    ))}
                  </BaseSelect>
                )}
              </form.Field>
            )
          }
        </form.Subscribe>
      </div>

      {/* From the SAVED policy: the server knows the calendar, the form does not. */}
      {saved?.clockMode === 'BusinessHours' && saved.holidayCalendar && (
        <p className="text-default-500 mt-2 text-sm">
          {saved.nextClosedDay && (
            <>
              Next closed day: {saved.nextClosedDay.name},{' '}
              {formatIsoDay(saved.nextClosedDay.date)}.{' '}
            </>
          )}
          <BaseButton
            variant="link"
            size="none"
            className="text-primary text-sm"
            onPress={() => setHolidaysOpen(true)}
          >
            See all {saved.closedDaysThisYear} days
          </BaseButton>
        </p>
      )}
      <HolidaysModal
        isOpen={holidaysOpen}
        onClose={() => setHolidaysOpen(false)}
        principalId={principalId}
        calendar={saved?.holidayCalendar ?? null}
        calendarLabel={
          HOLIDAY_CALENDARS.find(c => c.key === saved?.holidayCalendar)
            ?.label ?? 'Public holidays'
        }
        year={year}
      />
    </section>
  );
};
