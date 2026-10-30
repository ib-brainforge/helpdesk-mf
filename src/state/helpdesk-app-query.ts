import { createIdentityApiClient } from '@/utils/identityApiClient';
import { type AppDto, AppsApi } from '@brainforgeau/identity-management-client';

/**
 * The helpdesk app as identity-management describes it: its id, its roles and,
 * per resource group, the permissions those roles are made of.
 *
 * One query, shared by everything that needs it, so the app is fetched once
 * per session rather than once per caller. Today that is the assignee pickers
 * (which need the app id to list role assignments) and the development-only
 * "Preview as role" switcher (which needs the roles and their permissions).
 *
 * Resolved by name, the same name the app identifies itself by in
 * src/state/authorizedAxios.ts, rather than an id that differs per
 * environment.
 */
export const helpdeskAppQueryOptions = {
  queryKey: ['identity-app', 'helpdesk'] as const,
  queryFn: async (): Promise<AppDto | null> => {
    const apps = await createIdentityApiClient(AppsApi);
    const { data } = await apps.v1AppsByNameNameGet('helpdesk');
    return (data as AppDto | undefined) ?? null;
  },
  // Apps and their roles change rarely; nothing here should refetch on focus.
  staleTime: 5 * 60 * 1000,
};
