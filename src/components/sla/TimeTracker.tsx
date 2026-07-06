import type { TicketTimeTrackingDto } from '@/components/sla/hooks/useTimeTracking';
import { BaseInput, Icon } from '@brainforgeau/components';
import { Box } from '@brainforgeau/components/base';
import { BaseButton } from '@brainforgeau/components/button';
import { formatDateTime } from '@brainforgeau/components/utils';
import { useTimezone } from '@brainforgeau/security';
import type { FC } from 'react';
import { useCallback, useState } from 'react';

interface TimeTrackerProps {
  ticketId: string;
  timeTracking?: TicketTimeTrackingDto;
  onAddManualEntry?: (minutes: number, description: string) => void;
  onDeleteEntry?: (entryId: string) => void;
}

export const TimeTracker: FC<TimeTrackerProps> = ({
  timeTracking,
  onAddManualEntry,
  onDeleteEntry,
}) => {
  const timezone = useTimezone();
  const [manualMinutes, setManualMinutes] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const handleAddManualEntry = useCallback(() => {
    const minutes = Number.parseInt(manualMinutes, 10);
    if (Number.isNaN(minutes) || minutes <= 0) return;

    onAddManualEntry?.(minutes, manualDescription);
    setManualMinutes('');
    setManualDescription('');
    setShowManualEntry(false);
  }, [manualMinutes, manualDescription, onAddManualEntry]);

  return (
    <Box title="Time Tracking">
      {/* Manual Entry Form */}
      {showManualEntry ? (
        <div className="mb-4 space-y-2 rounded border dark:border-default-700 p-4">
          <BaseInput
            type="number"
            label="Minutes"
            value={manualMinutes}
            onChange={e => setManualMinutes(e.target.value)}
            placeholder="Enter minutes"
          />
          <BaseInput
            label="Description"
            value={manualDescription}
            onChange={e => setManualDescription(e.target.value)}
            placeholder="Optional description"
          />
          <div className="flex gap-2">
            <BaseButton
              size="sm"
              color="primary"
              onPress={handleAddManualEntry}
            >
              Add Entry
            </BaseButton>
            <BaseButton
              size="sm"
              variant="light"
              onPress={() => setShowManualEntry(false)}
            >
              Cancel
            </BaseButton>
          </div>
        </div>
      ) : (
        <BaseButton
          size="sm"
          variant="light"
          onPress={() => setShowManualEntry(true)}
          icon={<Icon name="plus" className="h-4 w-4" />}
          className="mb-4"
        >
          Add Time Entry
        </BaseButton>
      )}

      {/* Total Time */}
      {timeTracking && (
        <div className="mb-4 flex justify-between rounded bg-primary-50 dark:bg-primary-900/30 p-3">
          <span className="font-medium">Total Time:</span>
          <span className="font-bold">
            {formatDuration(timeTracking.totalMinutes)}
          </span>
        </div>
      )}

      {/* Time Entries List */}
      {timeTracking && timeTracking.entries.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-default-700 dark:text-default-300">
            Time Entries
          </h4>
          {timeTracking.entries.map(entry => (
            <div
              key={entry.id}
              className="flex items-center justify-between rounded border dark:border-default-700 p-2"
            >
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {formatDuration(entry.durationMinutes ?? 0)}
                </p>
                {entry.entryDate && (
                  <p className="text-xs text-default-500 dark:text-default-400">
                    {formatDateTime(entry.entryDate, { timezone })}
                  </p>
                )}
                {entry.description && (
                  <p className="text-xs text-default-600 dark:text-default-400">
                    {entry.description}
                  </p>
                )}
              </div>
              <div className="flex gap-1">
                <BaseButton
                  size="sm"
                  variant="light"
                  color="danger"
                  onPress={() => entry.id && onDeleteEntry?.(entry.id)}
                  icon={<Icon name="trash" className="h-3 w-3" />}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Box>
  );
};
