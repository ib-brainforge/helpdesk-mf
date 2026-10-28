import {
  BULK_TICKET_LIMIT,
  type BulkTicketAction,
  type BulkTicketFailureDto,
  type BulkTicketResultDto,
  bulkTicketAction,
} from '@/api/local/ticket-bulk';
import { toast } from '@heroui/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

/** A ticket to act on. */
export interface BulkTicketRef {
  id: string;
}

export type BulkTicketActionInput = {
  tickets: BulkTicketRef[];
  /**
   * Assign only: who the tickets went to, for the feedback ("Assigned to
   * Eric Isik"). Never sent; null or absent with no assignee reads
   * "Unassigned".
   */
  assigneeName?: string | null;
} & BulkTicketAction;

/** How each action reads in the feedback: "assign" / "3 tickets assigned". */
const WORDS: Record<BulkTicketAction['action'], [string, string]> = {
  Assign: ['assign', 'assigned'],
  SetStatus: ['update', 'updated'],
  SetPriority: ['update', 'updated'],
  Delete: ['delete', 'deleted'],
};

const tickets = (n: number) => `${n} ticket${n === 1 ? '' : 's'}`;

/** The distinct reasons, so ten "Ticket not found" rows read once. */
const reasonsOf = (result: BulkTicketResultDto): string =>
  Array.from(new Set(result.failed.map(f => f.reason).filter(Boolean))).join(
    '; ',
  );

/** The server's own words for a failed request, or a plain fallback. */
const requestErrorMessage = (error: unknown): string | undefined => {
  const response = (
    error as {
      response?: {
        status?: number;
        data?: {
          errors?: Array<{ message?: string }>;
          detail?: string;
          title?: string;
        };
      };
    }
  )?.response;
  const data =
    typeof response?.data === 'object' && response.data !== null
      ? response.data
      : undefined;
  const own = data?.errors?.[0]?.message ?? data?.detail;
  if (own) return own;
  if (response?.status === 403) return "You don't have permission to do this.";
  return data?.title;
};

const failAll = (
  ids: string[],
  code: string,
  reason: string,
): BulkTicketFailureDto[] => ids.map(ticketId => ({ ticketId, code, reason }));

/**
 * Assign, change status or priority, or delete tickets from the list: the
 * bulk bar and every row action (one ticket) go through here.
 *
 * POST /v1/tickets/bulk takes at most BULK_TICKET_LIMIT ids, so a longer
 * selection is sent in several requests. Each ticket succeeds or fails on its
 * own and the results are merged, so the feedback is honest about a partial
 * result. The list, its tab counts and any open ticket refresh once.
 *
 * Callers get the merged result in their own onSuccess, to keep the failed
 * rows selected.
 */
export const useBulkTicketAction = () => {
  const queryClient = useQueryClient();

  const run = async (
    ids: string[],
    action: BulkTicketAction,
  ): Promise<BulkTicketResultDto> => {
    const result: BulkTicketResultDto = { succeeded: [], failed: [] };
    for (let i = 0; i < ids.length; i += BULK_TICKET_LIMIT) {
      const part = ids.slice(i, i + BULK_TICKET_LIMIT);
      try {
        const answer = await bulkTicketAction({ ...action, ticketIds: part });
        result.succeeded.push(...(answer.succeeded ?? []));
        result.failed.push(...(answer.failed ?? []));
      } catch (error) {
        result.failed.push(
          ...failAll(
            part,
            'Request.Failed',
            requestErrorMessage(error) ?? 'The change could not be saved.',
          ),
        );
      }
    }
    return result;
  };

  return useMutation({
    mutationFn: async ({
      tickets: refs,
      assigneeName: _assigneeName,
      ...action
    }: BulkTicketActionInput): Promise<BulkTicketResultDto> => {
      const merged = await run(
        refs.map(ref => ref.id),
        action as BulkTicketAction,
      );
      // Every ticket asked about is accounted for: one the answer did not
      // mention counts as failed rather than silently unchanged.
      const answered = new Set([
        ...merged.succeeded,
        ...merged.failed.map(f => f.ticketId),
      ]);
      for (const ref of refs) {
        if (!answered.has(ref.id)) {
          merged.failed.push({
            ticketId: ref.id,
            code: 'Request.NoAnswer',
            reason: 'No answer for this ticket. Try again.',
          });
        }
      }
      return merged;
    },
    onSuccess: (result, input) => {
      const [verb, done] = WORDS[input.action];
      const ok = result.succeeded.length;
      const failed = result.failed.length;
      const reasons = reasonsOf(result);
      if (failed === 0 && input.action === 'Assign') {
        toast(
          input.assigneeId
            ? `Assigned to ${input.assigneeName ?? 'the chosen person'}`
            : 'Unassigned',
          {
            description: ok > 1 ? `${tickets(ok)} ${done}` : undefined,
            variant: 'success',
          },
        );
      } else if (failed === 0) {
        toast(`${tickets(ok)} ${done}`, { variant: 'success' });
      } else if (ok === 0) {
        toast(
          `Couldn't ${verb} ${tickets(failed)}${reasons ? `: ${reasons}` : ''}`,
          { variant: 'danger' },
        );
      } else {
        toast(
          `${ok} ${done}, ${failed} couldn't be ${done}${reasons ? `: ${reasons}` : ''}`,
          { variant: 'warning' },
        );
      }
    },
    onError: (error, input) => {
      const [verb] = WORDS[input.action];
      toast(`Couldn't ${verb} ${tickets(input.tickets.length)}`, {
        description: requestErrorMessage(error) ?? 'Please try again.',
        variant: 'danger',
      });
    },
    onSettled: () => {
      // The list and its tab counts share the 'tickets' prefix; 'ticket'
      // covers an open ticket and its History.
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['ticket'] });
    },
  });
};
