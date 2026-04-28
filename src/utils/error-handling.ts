/**
 * RFC 7807 Problem Details error handling utilities
 *
 * The API returns errors in the ProblemDetails format:
 * {
 *   type: string (URI reference identifying the problem type)
 *   title: string (short summary of the problem)
 *   status: number (HTTP status code)
 *   detail: string (human-readable explanation)
 *   instance: string (URI reference identifying the specific occurrence)
 *   errors?: Record<string, string[]> (validation errors by field)
 * }
 *
 * NOTE: These utilities will be re-exported from @brainforgeau/components
 * once the mf-packages PR is merged and the new package version is published.
 */

export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  errors?: Record<string, string[]>;
  traceId?: string;
}

export function extractErrorMessages(
  error: unknown,
  fallbackMessage = 'An unexpected error occurred'
): string[] {
  const err = error as any;
  const responseData = err?.response?.data;

  if (responseData) {
    if (responseData.errors && typeof responseData.errors === 'object') {
      const errorMessages: string[] = [];

      Object.entries(responseData.errors).forEach(([, messages]) => {
        if (Array.isArray(messages)) {
          messages.forEach((message) => {
            errorMessages.push(String(message));
          });
        } else if (messages) {
          errorMessages.push(String(messages));
        }
      });

      if (errorMessages.length > 0) {
        return errorMessages;
      }
    }

    if (responseData.detail) {
      return [responseData.detail];
    }

    if (responseData.title) {
      return [responseData.title];
    }

    if (responseData.message) {
      return [responseData.message];
    }
  }

  if (err?.message) {
    return [err.message];
  }

  return [fallbackMessage];
}

export function extractErrorMessage(
  error: unknown,
  fallbackMessage = 'An unexpected error occurred'
): string {
  const messages = extractErrorMessages(error, fallbackMessage);
  return messages.join('; ');
}

export function isValidationError(error: unknown): boolean {
  const err = error as any;
  const status = err?.response?.status;
  const hasErrors = err?.response?.data?.errors;

  return status === 400 && hasErrors;
}

export function isServerError(error: unknown): boolean {
  const err = error as any;
  const status = err?.response?.status;

  return status >= 500 && status < 600;
}

export function isNotFoundError(error: unknown): boolean {
  const err = error as any;
  return err?.response?.status === 404;
}

export function isUnauthorizedError(error: unknown): boolean {
  const err = error as any;
  return err?.response?.status === 401;
}

export function isForbiddenError(error: unknown): boolean {
  const err = error as any;
  return err?.response?.status === 403;
}

export function isConflictError(error: unknown): boolean {
  const err = error as any;
  return err?.response?.status === 409;
}

export function getErrorStatus(error: unknown): number | undefined {
  const err = error as any;
  return err?.response?.status;
}

export function getProblemDetails(error: unknown): ProblemDetails | undefined {
  const err = error as any;
  const data = err?.response?.data;

  if (data && (data.type || data.title || data.detail || data.status)) {
    return data as ProblemDetails;
  }

  return undefined;
}

export function formatFormErrors(errors: unknown[]): string {
  if (!errors || errors.length === 0) return '';

  return errors
    .map((error) => {
      if (typeof error === 'string') {
        return error;
      }
      if (error && typeof error === 'object') {
        const err = error as Record<string, unknown>;
        if ('message' in err && typeof err.message === 'string') {
          return err.message;
        }
        try {
          const str = JSON.stringify(error);
          return str !== '{}' ? str : 'Validation error';
        } catch {
          return 'Validation error';
        }
      }
      return String(error);
    })
    .filter(Boolean)
    .join(', ');
}

export const GLOBAL_ERROR_EVENT = 'bf:global-error';

export function shouldShowGlobalError(error: unknown): boolean {
  const status = getErrorStatus(error);
  if (!status) return false;
  return status === 400 || status >= 500;
}

export function dispatchGlobalError(error: unknown, path?: string): void {
  if (typeof window === 'undefined') return;

  const status = getErrorStatus(error);
  if (!status) return;

  const err = error as any;
  const message = extractErrorMessage(error);
  const details = err?.response?.data;

  window.dispatchEvent(
    new CustomEvent(GLOBAL_ERROR_EVENT, {
      detail: {
        status,
        message,
        path: path || err?.config?.url,
        details: status >= 500 ? details : undefined,
        type: status >= 500 ? 'server_error' : undefined,
      },
    })
  );
}
