import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import {
  type HelpdeskApplicationCategoriesCommandsCreateCategoryCreatePrincipalCategoryCommand,
  type HelpdeskApplicationCategoriesCommandsUpdateCategoryUpdatePrincipalCategoryCommand,
  PrincipalCategoriesApi,
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
      const client = await createHelpdeskApiClient(PrincipalCategoriesApi);
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
      const client = await createHelpdeskApiClient(PrincipalCategoriesApi);
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
      command: HelpdeskApplicationCategoriesCommandsCreateCategoryCreatePrincipalCategoryCommand,
    ) => {
      const client = await createHelpdeskApiClient(PrincipalCategoriesApi);
      const response = await client.v1PrincipalsPrincipalIdCategoriesPost(
        principalId,
        command,
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
      command: HelpdeskApplicationCategoriesCommandsUpdateCategoryUpdatePrincipalCategoryCommand;
    }) => {
      const client = await createHelpdeskApiClient(PrincipalCategoriesApi);
      await client.v1PrincipalsPrincipalIdCategoriesIdPut(
        principalId,
        id,
        command,
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, principalId] });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY, principalId, variables.id],
      });
    },
  });
}

export function useDeletePrincipalCategory(principalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const client = await createHelpdeskApiClient(PrincipalCategoriesApi);
      await client.v1PrincipalsPrincipalIdCategoriesIdDelete(principalId, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, principalId] });
    },
  });
}
