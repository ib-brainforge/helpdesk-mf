import { type DeadlinePriority, previewDeadline } from '@/api/local/deadlines';
import { formatDeadlineDateTime } from '@/components/shared/deadline';
import { useTimezone } from '@/security';
import { Icon } from '@brainforgeau/components/base';
import { useQuery } from '@tanstack/react-query';
import type { FC } from 'react';

interface DeadlinePreviewBoxProps {
  priority: DeadlinePriority;
  /** Company and organisation chosen on Details; part of the cache key. */
  scopeKey: string;
  /** Token for that scope; undefined when it is the app's own context. */
  scopeToken?: string;
  isReady: boolean;
  companyName?: string;
}

/**
 * The deadline this ticket will get, from the company's policy. Asked of the
 * backend, the same calculation that stamps the ticket, so the preview cannot
 * disagree with what the ticket then shows. Fetched only on the review step.
 */
export const DeadlinePreviewBox: FC<DeadlinePreviewBoxProps> = ({
  priority,
  scopeKey,
  scopeToken,
  isReady,
  companyName,
}) => {
  const timezone = useTimezone();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['deadline-preview', scopeKey, priority],
    enabled: isReady,
    staleTime: 60 * 1000,
    retry: false,
    queryFn: () => previewDeadline({ priority }, scopeToken),
  });

  return (
    <div className="border-light rounded-lg border px-4 py-3 text-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-semibold">Deadline this ticket will get</span>
        <span className="bg-light/60 text-gray inline-flex items-center gap-1 rounded-[2px] px-1.5 py-0.5 text-xs dark:text-light">
          <Icon name="clock" className="h-3 w-3" />
          Starts when created
        </span>
      </div>
      {isLoading && (
        <p className="text-light-gray text-xs">Working it out...</p>
      )}
      {isError && (
        <p className="text-light-gray text-xs">
          The deadline preview isn't available right now. The ticket still gets
          its deadline when it is created.
        </p>
      )}
      {data && (
        <>
          <div className="flex justify-between">
            <span>Reply by</span>
            <span className="font-semibold">
              {data.replyDueAt
                ? formatDeadlineDateTime(data.replyDueAt, timezone)
                : 'No target'}
            </span>
          </div>
          <div className="mt-1 flex justify-between">
            <span>Fix by</span>
            <span className="font-semibold">
              {data.fixDueAt
                ? formatDeadlineDateTime(data.fixDueAt, timezone)
                : 'No target'}
            </span>
          </div>
          {data.policy && (
            <p className="text-light-gray mt-2 text-xs">
              {companyName ? `${companyName}, ` : ''}
              {data.policy.priority} priority: {data.policy.targetsText}{' '}
              {data.policy.hoursText}
            </p>
          )}
        </>
      )}
    </div>
  );
};
