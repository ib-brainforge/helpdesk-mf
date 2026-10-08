import type { HelpdeskScope } from '@/api/local/scoped';
import { createContext, useContext } from 'react';

/**
 * The company a page's Helpdesk calls are answered for, when it is not the
 * app's own. Set by the ticket page for another company's ticket (see
 * TicketScopeProvider); null everywhere else, which is the app's own context.
 */
export const HelpdeskScopeContext = createContext<HelpdeskScope | null>(null);

/**
 * Pass the result to createHelpdeskApiClient or helpdeskAxios. Hooks whose
 * data differs by company (categories, custom statuses, tags) also put
 * helpdeskScopeKey(scope) in their query key.
 */
export const useHelpdeskScope = (): HelpdeskScope | null =>
  useContext(HelpdeskScopeContext);

/** A cache key part for company-dependent lists: the tenant id, or "own". */
export const helpdeskScopeKey = (scope: HelpdeskScope | null): string =>
  scope?.tenantId ?? 'own';
