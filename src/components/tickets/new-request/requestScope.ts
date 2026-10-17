import { requireIdentityApiBaseUrl } from '@/state/config';
import { createHelpdeskApiConfiguration } from '@/state/helpdeskApiClient';
import { createScopedApiClient } from '@/state/scopedApiClient';
import { toApiTicketPriority } from '@/utils/typeMappers';
import { TicketsApi } from '@brainforgeau/helpdesk-client';
import { ensureCrossAppToken } from '@brainforgeau/security';
import { createContext, useContext } from 'react';

/**
 * The tenant and organisation a new request is raised for, chosen on the
 * Details step.
 *
 * A context rather than a prop because the one consumer that needs it, the
 * vehicle picker, sits several components down inside the generic question
 * renderer. Outside the wizard it is null, and the picker falls back to the
 * app's own context.
 */
export interface RequestScope {
  tenantId: string | null;
  organisationId: string | null;
}

export const RequestScopeContext = createContext<RequestScope | null>(null);

export const useRequestScope = (): RequestScope | null =>
  useContext(RequestScopeContext);

interface NewTicket {
  subject: string;
  description: string;
  priority: string;
  categoryId: string;
}

/**
 * Confirms Helpdesk can be used for `scope` by issuing (and caching) a context
 * token for it. Identity refuses one where Helpdesk is not licensed, and an
 * embedding host whose security package predates the `context` override mints
 * for the wrong context (CrossAppTargetContextMismatchError); both are
 * reported as the same failure, in the axios-error shape the wizard reads
 * ({ response: { status, data } }).
 */
export const ensureRequestScopeAvailable = async (
  scope: RequestScope,
): Promise<void> => {
  try {
    if (!scope.tenantId) throw new Error('No tenant chosen');
    await ensureCrossAppToken({
      contextIssuerBaseUrl: requireIdentityApiBaseUrl(),
      targetApp: 'helpdesk',
      context: {
        tenantId: scope.tenantId,
        organisationId: scope.organisationId,
      },
    });
  } catch {
    throw Object.assign(new Error('scope token'), {
      response: {
        status: 403,
        data: {
          detail:
            "Helpdesk isn't available for the chosen organisation. Choose another, or ask an admin to enable Helpdesk for it.",
        },
      },
    });
  }
};

/**
 * Creates the ticket in `scope` and returns its id, plus a function that links
 * vehicles to it under the same scope (the app's own context may not be able
 * to see a ticket raised in another tenant).
 *
 * The backend stamps a new ticket's tenant and organisation from the context
 * token, not from the body, so raising a request for an organisation other
 * than the one the app is in means sending a token issued for it.
 */
export const createTicketInScope = async (
  scope: RequestScope,
  ticket: NewTicket,
): Promise<{ id: string; linkAsset: (assetId: string) => Promise<void> }> => {
  await ensureRequestScopeAvailable(scope);
  const client = await createScopedApiClient(
    TicketsApi,
    createHelpdeskApiConfiguration(),
    'helpdesk',
    scope,
  );
  const { data: id } = await client.v1TicketsPost({
    subject: ticket.subject,
    description: ticket.description,
    priority: toApiTicketPriority(ticket.priority),
    categoryId: ticket.categoryId,
  });
  return {
    id: String(id),
    linkAsset: async assetId => {
      await client.v1TicketsIdLinkedAssetsPost(String(id), { assetId });
    },
  };
};
