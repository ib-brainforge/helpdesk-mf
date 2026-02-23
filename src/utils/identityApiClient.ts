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
  const runtimeConfig = typeof window !== 'undefined' ? (window as any).__RUNTIME_CONFIG__ : null;
  const identityBaseUrl = runtimeConfig?.identityBaseUrl || __IDENTITY_BASE_URL__ || '';

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
