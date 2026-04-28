import type { FC } from 'react';
import { useState, useEffect, useCallback } from 'react';
import { BaseButton } from '@brainforgeau/components/button';
import { Icon, BaseInput } from '@brainforgeau/components';
import { Box } from '@brainforgeau/components/base';
import { formatDateTime } from '@brainforgeau/components/utils';
import { useTimezone } from '@brainforgeau/security';
import type { TimeEntryDto, TicketTimeTrackingDto } from '@/types';

interface TimeTrackerProps {
  ticketId: string;
  timeTracking?: TicketTimeTrackingDto;
  onStartTimer?: () => void;
  onStopTimer?: () => void;
  onPauseTimer?: () => void;
  onAddManualEntry?: (minutes: number, notes: string) => void;
  onEditEntry?: (entryId: string, minutes: number, notes: string) => void;
  onDeleteEntry?: (entryId: string) => void;
}

export const TimeTracker: FC<TimeTrackerProps> = ({
  ticketId,
  timeTracking,
  onStartTimer,
  onStopTimer,
  onPauseTimer,
  onAddManualEntry,
  onEditEntry,
  onDeleteEntry,
}) => {
  const timezone = useTimezone();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [manualMinutes, setManualMinutes] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);

  const isRunning = !!timeTracking?.activeEntry;

  useEffect(() => {
    if (!isRunning || !timeTracking?.activeEntry) {
      setElapsedSeconds(0);
      return;
    }

    const startTime = new Date(timeTracking.activeEntry.startTime).getTime();
    const updateElapsed = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      setElapsedSeconds(elapsed);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [isRunning, timeTracking?.activeEntry]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const handleAddManualEntry = useCallback(() => {
    const minutes = parseInt(manualMinutes, 10);
    if (isNaN(minutes) || minutes <= 0) return;

    onAddManualEntry?.(minutes, manualNotes);
    setManualMinutes('');
    setManualNotes('');
    setShowManualEntry(false);
  }, [manualMinutes, manualNotes, onAddManualEntry]);

  return (
    <Box title="Time Tracking">
      {/* Timer Display */}
      <div className="mb-6 rounded-lg bg-gray-100 p-6 text-center">
        <div className="mb-2 text-4xl font-mono font-bold">
          {formatTime(elapsedSeconds)}
        </div>
        <div className="flex justify-center gap-2">
          {!isRunning ? (
            <BaseButton
              color="success"
              onPress={onStartTimer}
              icon={<Icon name="play" className="h-4 w-4" />}
            >
              Start Timer
            </BaseButton>
          ) : (
            <>
              <BaseButton
                color="warning"
                onPress={onPauseTimer}
                icon={<Icon name="pause" className="h-4 w-4" />}
              >
                Pause
              </BaseButton>
              <BaseButton
                color="danger"
                onPress={onStopTimer}
                icon={<Icon name="stop" className="h-4 w-4" />}
              >
                Stop
              </BaseButton>
            </>
          )}
        </div>
      </div>

      {/* Manual Entry Form */}
      {showManualEntry ? (
        <div className="mb-4 space-y-2 rounded border p-4">
          <BaseInput
            type="number"
            label="Minutes"
            value={manualMinutes}
            onChange={(e) => setManualMinutes(e.target.value)}
            placeholder="Enter minutes"
          />
          <BaseInput
            label="Notes"
            value={manualNotes}
            onChange={(e) => setManualNotes(e.target.value)}
            placeholder="Optional notes"
          />
          <div className="flex gap-2">
            <BaseButton size="sm" color="primary" onPress={handleAddManualEntry}>
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
          Add Manual Entry
        </BaseButton>
      )}

      {/* Total Time */}
      {timeTracking && (
        <div className="mb-4 flex justify-between rounded bg-primary-50 p-3">
          <span className="font-medium">Total Time:</span>
          <span className="font-bold">{formatDuration(timeTracking.totalMinutes)}</span>
        </div>
      )}

      {/* Time Entries List */}
      {timeTracking && timeTracking.entries.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700">Time Entries</h4>
          {timeTracking.entries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between rounded border p-2">
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {formatDuration(entry.durationMinutes || 0)}
                  {entry.isBillable && (
                    <span className="ml-2 text-xs text-success">(Billable)</span>
                  )}
                </p>
                <p className="text-xs text-gray-500">
                  {entry.userName} • {formatDateTime(entry.startTime, { timezone })}
                </p>
                {entry.notes && <p className="text-xs text-gray-600">{entry.notes}</p>}
              </div>
              <div className="flex gap-1">
                <BaseButton
                  size="sm"
                  variant="light"
                  color="danger"
                  onPress={() => onDeleteEntry?.(entry.id)}
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
