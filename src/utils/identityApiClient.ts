import { createAuthorizedAxios } from '@/state/authorizedAxios';
import { requireIdentityApiBaseUrl } from '@/state/config';
import { Configuration } from '@brainforgeau/identity-management-client';

type IdentityApiConstructor<TClient> = new (
  configuration?: Configuration,
  basePath?: string,
  axios?: any,
) => TClient;

/**
 * Creates an API client for the identity API.
 *
 * Uses the current app's context token. The identity-management endpoints
 * accept users.read permission from any app (RequireApp = false).
 */
export const createIdentityApiClient = async <TClient>(
  ClientCtor: IdentityApiConstructor<TClient>,
): Promise<TClient> => {
  // identity-management's own named key. It lives on the AUTH host, not the app
  // host — exactly the URL that cannot be derived from the app origin. Throws
  // (stage 2 of failing loudly) when IDENTITY_API_BASE_URL was never configured.
  const identityBaseUrl = requireIdentityApiBaseUrl();

  const authorizedAxios = createAuthorizedAxios({
    identityBaseUrl,
  });

  const configuration = new Configuration({
    basePath: identityBaseUrl,
  });

  return new ClientCtor(configuration, undefined, authorizedAxios);
};
