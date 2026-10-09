import { createAuthorizedAxios } from '@/state/authorizedAxios';
import { requireIdentityApiBaseUrl } from '@/state/config';
import { Configuration } from '@brainforgeau/identity-management-client';
import {
  GLOBAL_ERROR_EVENT,
  isGlobalErrorStatus,
} from '@brainforgeau/security';
import type { AxiosError } from 'axios';

export interface IdentityApiClientOptions {
  /**
   * Errors the caller expects and explains on its own page, which must not
   * raise the app-wide error banner (for example identity refusing a token
   * for a company where Helpdesk is not licensed). Every other error still
   * raises it, exactly as without this option.
   */
  isExpectedError?: (error: AxiosError) => boolean;
}

/**
 * The app-wide banner, raised the way the shared client raises it, for an
 * error that was not expected.
 */
const reportUnexpected = (error: AxiosError): void => {
  const status = error.response?.status;
  if (!isGlobalErrorStatus(status) || typeof window === 'undefined') return;
  const data = error.response?.data as
    | { detail?: string; title?: string; message?: string }
    | undefined;
  window.dispatchEvent(
    new CustomEvent(GLOBAL_ERROR_EVENT, {
      detail: {
        status,
        path: error.config?.url,
        message: data?.message ?? data?.detail ?? data?.title ?? error.message,
      },
    }),
  );
};

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
  options?: IdentityApiClientOptions,
): Promise<TClient> => {
  // identity-management's own named key. It lives on the AUTH host, not the app
  // host — exactly the URL that cannot be derived from the app origin. Throws
  // (stage 2 of failing loudly) when IDENTITY_API_BASE_URL was never configured.
  const identityBaseUrl = requireIdentityApiBaseUrl();

  const expected = options?.isExpectedError;
  const authorizedAxios = createAuthorizedAxios({
    identityBaseUrl,
    // With expected errors, the banner is raised here instead, for the rest.
    ...(expected
      ? {
          emitNavbarEvent: false,
          onError: (error: AxiosError) => {
            if (!expected(error)) reportUnexpected(error);
          },
        }
      : {}),
  });

  const configuration = new Configuration({
    basePath: identityBaseUrl,
  });

  return new ClientCtor(configuration, undefined, authorizedAxios);
};
