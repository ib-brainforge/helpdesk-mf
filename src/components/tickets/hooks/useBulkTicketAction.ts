import {
  BULK_TICKET_LIMIT,
  type BulkTicketRequest,
  type BulkTicketResultDto,
  bulkTicketAction,
} from '@/api/local/ticket-bulk';
import { useHelpdeskAccess } from '@/hooks/useHelpdeskAccess';
import { toast } from '@heroui/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

/** How each action reads in the feedback: "assign" / "3 tickets assigned". */
const WORDS: Record<BulkTicketRequest['action'], [string, string]> = {
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

const requestErrorMessage = (error: unknown): string | undefined => {
  const data = (
    error as {
      response?: {
        data?: {
          errors?: Array<{ message?: string }>;
          detail?: string;
          title?: string;
        };
      };
    }
  )?.response?.data;
  return data?.errors?.[0]?.message ?? data?.detail ?? data?.title;
};

/**
 * Assign, change status or priority, or delete tickets from the list: the
 * bulk bar and every row action (one id) go through here.
 *
 * Scoped exactly as useTicketsData reads the list: the principal route when
 * the list is the all-companies view, otherwise the tenant route. Each ticket
 * succeeds or fails on its own, and the result says which, so the feedback
 * is honest about a partial result rather than silent. The list, its tab
 * counts and any open ticket refresh once, whatever the outcome.
 *
 * Callers get the result in their own onSuccess, to keep the failed rows
 * selected.
 */
export const useBulkTicketAction = () => {
  const queryClient = useQueryClient();
  const { isServiceAdmin, principalId } = useHelpdeskAccess();
  const scopePrincipalId =
    isServiceAdmin && principalId ? principalId : undefined;

  return useMutation({
    mutationFn: async (
      request: BulkTicketRequest,
    ): Promise<BulkTicketResultDto> => {
      // One request in the usual case; larger selections go in turn, so the
      // backend's cap never turns into a request-level failure.
      const result: BulkTicketResultDto = { succeeded: [], failed: [] };
      for (let i = 0; i < request.ticketIds.length; i += BULK_TICKET_LIMIT) {
        const part = await bulkTicketAction(
          {
            ...request,
            ticketIds: request.ticketIds.slice(i, i + BULK_TICKET_LIMIT),
          },
          scopePrincipalId,
        );
        result.succeeded.push(...(part.succeeded ?? []));
        result.failed.push(...(part.failed ?? []));
      }
      return result;
    },
    onSuccess: (result, request) => {
      const [verb, done] = WORDS[request.action];
      const ok = result.succeeded.length;
      const failed = result.failed.length;
      const reasons = reasonsOf(result);
      if (failed === 0) {
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
    onError: (error, request) => {
      const [verb] = WORDS[request.action];
      toast(`Couldn't ${verb} ${tickets(request.ticketIds.length)}`, {
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
