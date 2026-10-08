import {
  type HelpdeskScope,
  getHelpdeskScopeToken,
  isNotLicensedError,
} from '@/api/local/scoped';
import {
  BULK_TICKET_LIMIT,
  type BulkTicketAction,
  type BulkTicketFailureDto,
  type BulkTicketResultDto,
  bulkTicketAction,
} from '@/api/local/ticket-bulk';
import { useHelpdeskAccess } from '@/hooks/useHelpdeskAccess';
import { useScopeNames } from '@/hooks/useScopeNames';
import { toast } from '@heroui/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

/** A ticket to act on, with the company it belongs to (from the list row). */
export interface BulkTicketRef {
  id: string;
  tenantId?: string | null;
}

export type BulkTicketActionInput = {
  tickets: BulkTicketRef[];
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

const failAll = (
  ids: string[],
  code: string,
  reason: string,
): BulkTicketFailureDto[] => ids.map(ticketId => ({ ticketId, code, reason }));

/**
 * Assign, change status or priority, or delete tickets from the list: the
 * bulk bar and every row action (one ticket) go through here.
 *
 * POST /v1/tickets/bulk answers for one company, so the tickets are grouped by
 * company and each group is sent with that company's own token, in parallel:
 * the app's own context for the viewer's company, otherwise the company's
 * Helpdesk token from the same cache the ticket page uses. A company where
 * Helpdesk is not licensed is never sent anything; its tickets fail with
 * "Helpdesk isn't enabled for <Company>". Each ticket succeeds or fails on its
 * own and the results are merged, so the feedback is honest about a partial
 * result. The list, its tab counts and any open ticket refresh once.
 *
 * Callers get the merged result in their own onSuccess, to keep the failed
 * rows selected.
 */
export const useBulkTicketAction = () => {
  const queryClient = useQueryClient();
  const { tenantId: viewerTenantId } = useHelpdeskAccess();
  const { byTenantId } = useScopeNames();
  const companyName = (tenantId: string) =>
    byTenantId.get(tenantId)?.tenantName ?? 'this company';

  /** One company's tickets, in requests of at most BULK_TICKET_LIMIT. */
  const runForCompany = async (
    ids: string[],
    action: BulkTicketAction,
    tenantId: string | null,
  ): Promise<BulkTicketResultDto> => {
    const result: BulkTicketResultDto = { succeeded: [], failed: [] };
    const scope: HelpdeskScope | null =
      tenantId && tenantId !== viewerTenantId ? { tenantId } : null;
    const notEnabled = () =>
      failAll(
        ids,
        'Company.NotLicensed',
        `Helpdesk isn't enabled for ${companyName(tenantId ?? '')}`,
      );

    if (scope) {
      try {
        await getHelpdeskScopeToken(scope);
      } catch (error) {
        result.failed = isNotLicensedError(error)
          ? notEnabled()
          : failAll(
              ids,
              'Company.Unavailable',
              `Couldn't reach ${companyName(scope.tenantId)}. Try again.`,
            );
        return result;
      }
    }

    for (let i = 0; i < ids.length; i += BULK_TICKET_LIMIT) {
      const part = ids.slice(i, i + BULK_TICKET_LIMIT);
      try {
        const answer = await bulkTicketAction(
          { ...action, ticketIds: part },
          scope,
        );
        result.succeeded.push(...(answer.succeeded ?? []));
        result.failed.push(...(answer.failed ?? []));
      } catch (error) {
        result.failed.push(
          ...(isNotLicensedError(error)
            ? notEnabled().filter(f => part.includes(f.ticketId))
            : failAll(
                part,
                'Request.Failed',
                requestErrorMessage(error) ?? 'The change could not be saved.',
              )),
        );
      }
    }
    return result;
  };

  return useMutation({
    mutationFn: async ({
      tickets: refs,
      ...action
    }: BulkTicketActionInput): Promise<BulkTicketResultDto> => {
      const byCompany = new Map<string | null, string[]>();
      for (const ref of refs) {
        const key = ref.tenantId ?? null;
        byCompany.set(key, [...(byCompany.get(key) ?? []), ref.id]);
      }
      const parts = await Promise.all(
        Array.from(byCompany, ([tenantId, ids]) =>
          runForCompany(ids, action as BulkTicketAction, tenantId),
        ),
      );
      return {
        succeeded: parts.flatMap(p => p.succeeded),
        failed: parts.flatMap(p => p.failed),
      };
    },
    onSuccess: (result, input) => {
      const [verb, done] = WORDS[input.action];
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
