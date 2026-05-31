// TimerTriggerEditor — duration picker + business-hours dropdown for Timer trigger transitions.
// Cron picker library deferred to Plan 7; this uses a friendly input approach.

import { useBusinessHoursSchedules } from '@/hooks/useBusinessHoursSchedules';
import {
  BaseInput,
  BaseSelect,
  BaseSelectItem,
  BaseToggle,
} from '@brainforgeau/components';
import { useMemo } from 'react';
import type { TimerTriggerSpecDto } from '../types';

export interface TimerTriggerEditorProps {
  value: TimerTriggerSpecDto | null | undefined;
  readOnly?: boolean;
  onChange: (spec: TimerTriggerSpecDto | null) => void;
}

/** Rough human-readable approximation of an ISO-8601 duration.
 * Anchors hour/minute extraction to the T portion to avoid matching
 * month-designator M (e.g. P1M must not match as minutes).
 */
function describeIso8601Duration(duration: string): string {
  if (!duration) return '';
  // Match common patterns: PT1H30M, P7D, PT2H, etc.
  const dayMatch = duration.match(/(\d+)D/i);
  // REVIEW: Anchored to T portion — avoids matching P1M (months) as minutes.
  const hourMatch = duration.match(/T.*?(\d+)H/);
  const minMatch = duration.match(/T.*?(\d+)M/);

  const parts: string[] = [];
  if (dayMatch)
    parts.push(`${dayMatch[1]} day${dayMatch[1] !== '1' ? 's' : ''}`);
  if (hourMatch)
    parts.push(`${hourMatch[1]} hour${hourMatch[1] !== '1' ? 's' : ''}`);
  if (minMatch)
    parts.push(`${minMatch[1]} minute${minMatch[1] !== '1' ? 's' : ''}`);
  if (parts.length === 0) return '';
  return `Approximately fires after: ${parts.join(', ')}`;
}

export function TimerTriggerEditor({
  value,
  readOnly,
  onChange,
}: TimerTriggerEditorProps) {
  const spec = value as Partial<TimerTriggerSpecDto> | null | undefined;
  const duration = spec?.duration ?? '';
  const useBusinessHours = spec?.useBusinessHours ?? false;
  const businessHoursScheduleId = spec?.businessHoursScheduleId;

  const { data: schedules, isLoading: schedulesLoading } =
    useBusinessHoursSchedules();

  const preview = useMemo(() => {
    if (!duration) return '';
    const base = describeIso8601Duration(duration);
    if (!base) return '';
    return useBusinessHours
      ? `${base} (business hours only)`
      : `${base} (calendar time)`;
  }, [duration, useBusinessHours]);

  const selectedSchedule = useMemo(
    () => schedules?.find(s => s.id === businessHoursScheduleId) ?? null,
    [schedules, businessHoursScheduleId],
  );

  function update(patch: Partial<TimerTriggerSpecDto>) {
    const next: TimerTriggerSpecDto = {
      duration: spec?.duration ?? '',
      useBusinessHours: spec?.useBusinessHours ?? false,
      businessHoursScheduleId: spec?.businessHoursScheduleId,
      ...patch,
    };
    onChange(next);
  }

  function handleScheduleChange(key: string | number | null) {
    const id = key != null ? String(key) : undefined;
    update({ businessHoursScheduleId: id, useBusinessHours: true });
  }

  return (
    <div className="space-y-3 border-t border-gray-200 pt-3 mt-1">
      <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
        Timer Settings
      </h4>

      <BaseInput
        label="Duration (ISO 8601)"
        value={duration}
        onValueChange={val => update({ duration: val })}
        readOnly={readOnly}
        labelPlacement="outside"
        size="sm"
        placeholder="e.g. PT1H30M (1h 30m), P7D (7 days)"
        description={preview || 'Enter a duration, e.g. P7D for 7 days'}
      />

      <div className="flex items-center gap-3">
        <BaseToggle
          isSelected={useBusinessHours}
          onChange={val => update({ useBusinessHours: val })}
          isDisabled={readOnly}
          aria-label="Use business hours for timer calculation"
        />
        <div>
          <span className="text-sm text-gray-700">Use business hours</span>
          <p className="text-xs text-gray-400 mt-0.5">
            Timer counts only during configured business hours.
          </p>
        </div>
      </div>

      {useBusinessHours && (
        <div className="space-y-1">
          <BaseSelect
            label="Business hours schedule"
            placeholder={
              schedulesLoading ? 'Loading schedules…' : 'Select a schedule'
            }
            selectedKey={businessHoursScheduleId ?? null}
            onSelectionChange={handleScheduleChange}
            isDisabled={readOnly || schedulesLoading}
            size="sm"
            aria-label="Select business hours schedule"
          >
            {(schedules ?? []).map(s => (
              <BaseSelectItem key={s.id ?? ''} value={s.id ?? ''}>
                {s.name ?? s.id ?? ''}
              </BaseSelectItem>
            ))}
          </BaseSelect>
          {selectedSchedule?.timeWindowSummary && (
            <p className="text-xs text-gray-400 mt-0.5">
              {selectedSchedule.timeWindowSummary}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
