import { Configuration } from '@brainforgeau/identity-management-client';
import { createAuthorizedAxios } from '@/state/authorizedAxios';

declare const __IDENTITY_BASE_URL__: string | undefined;

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
  if (!__IDENTITY_BASE_URL__) {
    throw new Error('Identity API base URL is not configured');
  }

  const authorizedAxios = createAuthorizedAxios({
    identityBaseUrl: __IDENTITY_BASE_URL__,
  });

  const configuration = new Configuration({
    basePath: __IDENTITY_BASE_URL__,
  });

  return new ClientCtor(configuration, undefined, authorizedAxios);
};
