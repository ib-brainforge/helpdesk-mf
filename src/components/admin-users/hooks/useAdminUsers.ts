import { AdminUsersApi } from '@/api/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type { TenantUserDto, UserRoleDto } from '@/types/admin-user';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const TENANT_USERS_KEY = 'helpdesk-admin-tenant-users';

export const useTenantUsers = () => {
  const { data, isLoading, refetch } = useQuery<TenantUserDto[]>({
    queryKey: [TENANT_USERS_KEY],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(AdminUsersApi);
      const response = await client.v1AdminTenantUsersGet();
      return (response.data as TenantUserDto[]) ?? [];
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
      const client = await createHelpdeskApiClient(AdminUsersApi);
      const response = await client.v1AdminUsersUserIdRolesGet(userId);
      return (response.data as UserRoleDto[]) ?? [];
    },
    enabled: !!userId,
  });
};

export const useAssignUserRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      roleName,
    }: { userId: string; roleName: string }) => {
      const client = await createHelpdeskApiClient(AdminUsersApi);
      const response = await client.v1AdminUsersUserIdRolesPost(userId, {
        roleName,
      } as never);
      return response.data as string;
    },
    onSuccess: (_data, { userId }) => {
      queryClient.invalidateQueries({
        queryKey: ['helpdesk-user-roles', userId],
      });
      queryClient.invalidateQueries({ queryKey: [TENANT_USERS_KEY] });
    },
  });
};

export const useUnassignUserRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      roleName,
    }: { userId: string; roleName: string }) => {
      const client = await createHelpdeskApiClient(AdminUsersApi);
      await client.v1AdminUsersUserIdRolesRoleNameDelete(userId, roleName);
    },
    onSuccess: (_data, { userId }) => {
      queryClient.invalidateQueries({
        queryKey: ['helpdesk-user-roles', userId],
      });
      queryClient.invalidateQueries({ queryKey: [TENANT_USERS_KEY] });
    },
  });
};
