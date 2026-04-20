/**
 * usePrincipalCategories — CRUD hooks for principal-scoped categories.
 *
 * The published @brainforgeau/helpdesk-client does not yet export PrincipalCategoriesApi
 * or the Principal-prefixed command types. We use CategoriesApi as the class token and cast
 * to `any` to call the principal-scoped methods at runtime.
 *
 * REVIEW: Remove casts once helpdesk-backend republishes with PrincipalCategoriesApi exported.
 */

import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import {
  type HelpdeskApplicationCategoriesCommandsCreateCategoryCreateCategoryCommand,
  type HelpdeskApplicationCategoriesCommandsUpdateCategoryUpdateCategoryCommand,
  CategoriesApi,
} from '@brainforgeau/helpdesk-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const QUERY_KEY = 'principal-categories';

export function usePrincipalCategories(
  principalId: string,
  includeInactive = false,
) {
  return useQuery({
    queryKey: [QUERY_KEY, principalId, includeInactive],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client: any = await createHelpdeskApiClient(CategoriesApi);
      const response = await client.v1PrincipalsPrincipalIdCategoriesGet(
        principalId,
        includeInactive,
      );
      return response.data ?? [];
    },
    enabled: Boolean(principalId),
  });
}

export function usePrincipalCategory(principalId: string, id: string) {
  return useQuery({
    queryKey: [QUERY_KEY, principalId, id],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client: any = await createHelpdeskApiClient(CategoriesApi);
      const response = await client.v1PrincipalsPrincipalIdCategoriesIdGet(
        principalId,
        id,
      );
      return response.data;
    },
    enabled: Boolean(principalId) && Boolean(id),
  });
}

export function useCreatePrincipalCategory(principalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      command: HelpdeskApplicationCategoriesCommandsCreateCategoryCreateCategoryCommand,
    ) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client: any = await createHelpdeskApiClient(CategoriesApi);
      const response = await client.v1PrincipalsPrincipalIdCategoriesPost(
        principalId,
        {
          ...command,
          principalId,
        },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, principalId] });
    },
  });
}

export function useUpdatePrincipalCategory(principalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      command,
    }: {
      id: string;
      command: HelpdeskApplicationCategoriesCommandsUpdateCategoryUpdateCategoryCommand;
    }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client: any = await createHelpdeskApiClient(CategoriesApi);
      await client.v1PrincipalsPrincipalIdCategoriesIdPut(principalId, id, {
        ...command,
        id,
        principalId,
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, principalId] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, principalId, variables.id] });
    },
  });
}

export function useDeletePrincipalCategory(principalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client: any = await createHelpdeskApiClient(CategoriesApi);
      await client.v1PrincipalsPrincipalIdCategoriesIdDelete(principalId, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, principalId] });
    },
  });
}
