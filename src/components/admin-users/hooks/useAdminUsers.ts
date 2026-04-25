import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authorizedAxios } from '@/state/authorizedAxios';
import { configAtom } from '@/state/config';
import { getDefaultStore } from 'jotai';
import type { TenantUserDto, UserRoleDto } from '@/types/admin-user';
import type { RuntimeConfig } from '@brainforgeau/security';

// REVIEW: Using authorizedAxios directly until helpdesk-client is updated with Wave 7.2 endpoints (backend PR #60).
// Replace with generated AdminUsersApi once the PR is merged and a new client version published.

const store = getDefaultStore();

function getBaseUrl(): string {
  const config = store.get(configAtom) as RuntimeConfig;
  return config?.api?.baseUrl ?? '';
}

const TENANT_USERS_KEY = 'helpdesk-admin-tenant-users';

export const useTenantUsers = () => {
  const { data, isLoading, refetch } = useQuery<TenantUserDto[]>({
    queryKey: [TENANT_USERS_KEY],
    queryFn: async () => {
      const baseUrl = getBaseUrl();
      const response = await authorizedAxios.get<TenantUserDto[]>(
        `${baseUrl}/v1/admin/tenant-users`,
      );
      return response.data ?? [];
    },
  });

  return {
    tenantUsers: data ?? [],
    isLoading,
    refetch,
  };
};

export const useUserRoles = (userId: string | null) => {
  return useQuery<UserRoleDto[]>({
    queryKey: ['helpdesk-user-roles', userId],
    queryFn: async () => {
      if (!userId) return [];
      const baseUrl = getBaseUrl();
      const response = await authorizedAxios.get<UserRoleDto[]>(
        `${baseUrl}/v1/admin/users/${userId}/roles`,
      );
      return response.data ?? [];
    },
    enabled: !!userId,
  });
};

export const useAssignUserRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, roleName }: { userId: string; roleName: string }) => {
      const baseUrl = getBaseUrl();
      const response = await authorizedAxios.post<string>(
        `${baseUrl}/v1/admin/users/${userId}/roles`,
        { roleName },
      );
      return response.data;
    },
    onSuccess: (_data, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['helpdesk-user-roles', userId] });
      queryClient.invalidateQueries({ queryKey: [TENANT_USERS_KEY] });
    },
  });
};

export const useUnassignUserRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, roleName }: { userId: string; roleName: string }) => {
      const baseUrl = getBaseUrl();
      await authorizedAxios.delete(
        `${baseUrl}/v1/admin/users/${userId}/roles/${encodeURIComponent(roleName)}`,
      );
    },
    onSuccess: (_data, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['helpdesk-user-roles', userId] });
      queryClient.invalidateQueries({ queryKey: [TENANT_USERS_KEY] });
    },
  });
};
