import type { FC } from 'react';
import { Card } from '@heroui/react';
import { StatusBadge } from '@/components/shared';
import { Icon } from '@brainforgeau/components/base';
import { SlaStatus, type SlaIndicatorDto } from '@/types';

interface SlaIndicatorProps {
  slaData: SlaIndicatorDto;
  variant?: 'compact' | 'full';
}

export const SlaIndicator: FC<SlaIndicatorProps> = ({
  slaData,
  variant = 'full',
}) => {
  const formatTimeRemaining = (minutes: number | undefined): string => {
    if (minutes === undefined) return 'N/A';

    if (minutes < 0) {
      const absMinutes = Math.abs(minutes);
      const hours = Math.floor(absMinutes / 60);
      const mins = absMinutes % 60;
      return `Overdue ${hours}h ${mins}m`;
    }

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getStatusColor = (status: SlaStatus | undefined): 'success' | 'warning' | 'danger' => {
    switch (status) {
      case SlaStatus.OnTrack:
        return 'success';
      case SlaStatus.Warning:
        return 'warning';
      case SlaStatus.Breached:
        return 'danger';
      default:
        return 'success';
    }
  };

  const getStatusIcon = (status: SlaStatus | undefined): string => {
    switch (status) {
      case SlaStatus.OnTrack:
        return 'check-circle';
      case SlaStatus.Warning:
        return 'exclamation-triangle';
      case SlaStatus.Breached:
        return 'x-circle';
      default:
        return 'clock';
    }
  };

  if (variant === 'compact') {
    return (
      <div className="flex gap-2">
        {slaData.responseStatus !== undefined && (
          <StatusBadge
            color={getStatusColor(slaData.responseStatus)}
          >
            <Icon name={getStatusIcon(slaData.responseStatus)} className="h-3 w-3" />
            Response: {formatTimeRemaining(slaData.responseTimeRemaining)}
          </StatusBadge>
        )}
        {slaData.resolutionStatus !== undefined && (
          <StatusBadge
            color={getStatusColor(slaData.resolutionStatus)}
          >
            <Icon name={getStatusIcon(slaData.resolutionStatus)} className="h-3 w-3" />
            Resolution: {formatTimeRemaining(slaData.resolutionTimeRemaining)}
          </StatusBadge>
        )}
      </div>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="mb-4 text-lg font-semibold">SLA Status</h3>
      <div className="space-y-4">
        {slaData.responseStatus !== undefined && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon
                name={getStatusIcon(slaData.responseStatus)}
                className={`h-5 w-5 text-${getStatusColor(slaData.responseStatus)}`}
              />
              <span className="font-medium">First Response Time</span>
            </div>
            <div className="text-right">
              <p className={`font-semibold text-${getStatusColor(slaData.responseStatus)}`}>
                {formatTimeRemaining(slaData.responseTimeRemaining)}
              </p>
              {slaData.responseTimeDeadline && (
                <p className="text-xs text-gray-500">
                  Due: {new Date(slaData.responseTimeDeadline).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        )}

        {slaData.resolutionStatus !== undefined && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon
                name={getStatusIcon(slaData.resolutionStatus)}
                className={`h-5 w-5 text-${getStatusColor(slaData.resolutionStatus)}`}
              />
              <span className="font-medium">Resolution Time</span>
            </div>
            <div className="text-right">
              <p className={`font-semibold text-${getStatusColor(slaData.resolutionStatus)}`}>
                {formatTimeRemaining(slaData.resolutionTimeRemaining)}
              </p>
              {slaData.resolutionTimeDeadline && (
                <p className="text-xs text-gray-500">
                  Due: {new Date(slaData.resolutionTimeDeadline).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
