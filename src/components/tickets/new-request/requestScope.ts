import { issueScopeToken, scopedRequest } from '@/api/local/scoped';
import type { CreateTicketContactFields } from '@/api/local/tickets';
import { requireHelpdeskApiBaseUrl } from '@/state/config';
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

interface NewTicket extends CreateTicketContactFields {
  subject: string;
  description: string;
  priority: string;
  categoryId: string;
}

/**
 * Creates the ticket in `scope` and returns its id, plus a function that links
 * vehicles to it under the same scope (the app's own context may not be able
 * to see a ticket raised in another tenant).
 *
 * The backend stamps a new ticket's tenant and organisation from the context
 * token, not from the body, so raising a request for an organisation other
 * than the one the app is in means sending a token issued for that
 * organisation. Pass `issuedToken: null` when the scope IS the app's own
 * context; the request then goes out in it, with no token to issue.
 *
 * A failure is thrown in the shape of an axios error ({ response: { status,
 * data } }) so the wizard explains it the same way whichever path was taken.
 */
export const createTicketInScope = async (
  scope: RequestScope,
  ticket: NewTicket,
  /** A token already issued for `scope`; null for the app's own context. */
  issuedToken?: string | null,
): Promise<{ id: string; linkAsset: (assetId: string) => Promise<void> }> => {
  let token: string | undefined;
  if (issuedToken !== null) {
    try {
      token = issuedToken ?? (await issueScopeToken(scope, 'helpdesk'));
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
  }
  const base = requireHelpdeskApiBaseUrl();
  const id = await scopedRequest<string>({
    method: 'POST',
    url: `${base}/v1/tickets`,
    token,
    body: ticket,
  });
  return {
    id: String(id),
    linkAsset: async assetId => {
      await scopedRequest({
        method: 'POST',
        url: `${base}/v1/tickets/${id}/linked-assets`,
        token,
        body: { assetId },
      });
    },
  };
};
