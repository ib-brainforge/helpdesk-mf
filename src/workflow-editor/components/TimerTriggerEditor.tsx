// TimerTriggerEditor — duration picker + business-hours toggle for Timer trigger transitions.
// Cron picker library deferred to Plan 7; this uses a friendly input approach.

import { BaseInput } from '@brainforgeau/components';
import { Switch } from '@heroui/react';
import { useMemo } from 'react';
import type { TimerTriggerSpecDto } from '../types';

export interface TimerTriggerEditorProps {
  value: TimerTriggerSpecDto | null | undefined;
  readOnly?: boolean;
  onChange: (spec: TimerTriggerSpecDto | null) => void;
}

/** Rough human-readable approximation of an ISO-8601 duration */
function describeIso8601Duration(duration: string): string {
  if (!duration) return '';
  // Match common patterns: PT1H30M, P7D, PT2H, etc.
  const dayMatch = duration.match(/(\d+)D/i);
  const hourMatch = duration.match(/(\d+)H/i);
  const minMatch = duration.match(/(\d+)M(?!O)/i); // M not followed by O (month)

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

  const preview = useMemo(() => {
    if (!duration) return '';
    const base = describeIso8601Duration(duration);
    if (!base) return '';
    return useBusinessHours
      ? `${base} (business hours only)`
      : `${base} (calendar time)`;
  }, [duration, useBusinessHours]);

  function update(patch: Partial<TimerTriggerSpecDto>) {
    const next: TimerTriggerSpecDto = {
      duration: spec?.duration ?? '',
      useBusinessHours: spec?.useBusinessHours ?? false,
      businessHoursScheduleId: spec?.businessHoursScheduleId,
      ...patch,
    };
    onChange(next);
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
        isReadOnly={readOnly}
        labelPlacement="outside"
        size="sm"
        placeholder="e.g. PT1H30M (1h 30m), P7D (7 days)"
        description={preview || 'Enter a duration, e.g. P7D for 7 days'}
      />

      <div className="flex items-center gap-3">
        <Switch
          isSelected={useBusinessHours}
          onValueChange={val => update({ useBusinessHours: val })}
          isDisabled={readOnly}
          size="sm"
          aria-label="Use business hours for timer calculation"
        />
        <div>
          <span className="text-sm text-gray-700">Use business hours</span>
          <p className="text-xs text-gray-400 mt-0.5">
            Timer counts only during configured business hours.
            {useBusinessHours && (
              <span className="block text-gray-400 mt-0.5">
                Business hours schedule — wired in Plan 7.
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
