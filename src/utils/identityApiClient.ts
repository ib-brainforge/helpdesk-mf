import { Configuration } from '@brainforgeau/identity-management-client';
import { createAuthorizedAxios } from '@/state/authorizedAxios';
import { getAppConfig } from '@/state/config';

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
  const appConfig = getAppConfig();
  const identityBaseUrl = appConfig?.identityBaseUrl || '';

  if (!identityBaseUrl) {
    throw new Error('Identity API base URL is not configured');
  }

  const authorizedAxios = createAuthorizedAxios({
    identityBaseUrl,
  });

  const configuration = new Configuration({
    basePath: identityBaseUrl,
  });

  return new ClientCtor(configuration, undefined, authorizedAxios);
};
