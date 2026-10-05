import { getAccessToken } from '@/state/authorizedAxios';
import { requireHelpdeskApiBaseUrl } from '@/state/config';
import { createContext, useContext } from 'react';
import { issueScopeToken } from '../hooks/useAssets';

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
 * POST to the Helpdesk API as the given scope.
 *
 * The backend stamps a new ticket's tenant and organisation from the context
 * token, not from the body, so raising a request for an organisation other
 * than the one the app is in means sending a token issued for that
 * organisation. fetch, not authorizedAxios, for the reason given in
 * useAssets' scopedGet: its interceptor always replaces X-Context-Token with
 * the app's own.
 *
 * A failure is thrown in the shape of an axios error ({ response: { status,
 * data } }) so the wizard explains it the same way whichever path was taken.
 */
const scopedPost = async <T>(
  token: string,
  path: string,
  body: unknown,
): Promise<T> => {
  // biome-ignore lint/style/noRestrictedGlobals: authorizedAxios cannot send a scope-specific context token (see above)
  const res = await fetch(`${requireHelpdeskApiBaseUrl()}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${await getAccessToken()}`,
      'X-Context-Token': token,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: unknown = text || undefined;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    // Not JSON; keep the text.
  }
  if (!res.ok) {
    throw Object.assign(new Error(`${res.status} for ${path}`), {
      response: { status: res.status, data },
    });
  }
  return data as T;
};

/**
 * Creates the ticket in `scope` and returns its id, plus a function that links
 * vehicles to it under the same scope (the app's own context may not be able
 * to see a ticket raised in another tenant).
 */
export const createTicketInScope = async (
  scope: RequestScope,
  ticket: NewTicket,
  /** A token already issued for `scope`, when the caller has one. */
  issuedToken?: string,
): Promise<{ id: string; linkAsset: (assetId: string) => Promise<void> }> => {
  let token: string;
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
  const id = await scopedPost<string>(token, '/v1/tickets', ticket);
  return {
    id: String(id),
    linkAsset: async assetId => {
      await scopedPost(token, `/v1/tickets/${id}/linked-assets`, { assetId });
    },
  };
};
