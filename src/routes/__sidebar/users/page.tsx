import { Breadcrumbs } from '@/components/Breadcrumbs';
import { BaseTable, TablePagination } from '@brainforgeau/components';
import { BaseButton } from '@brainforgeau/components/button';
import {
  UsersTableFilters,
  createUsersColumns,
  useUsersData,
  useUsersFilters,
  useUsersTable,
  type UsersRow,
} from '@components/users';
import { addToast } from '@heroui/react';
import { Helmet } from '@modern-js/runtime/head';
import { useMutation } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { UsersApi } from '@brainforgeau/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';

function UsersPage() {
  const { items, totalCount, pagination, setPagination, isLoading, refetch } = useUsersData();
  const { searchTerm } = useUsersFilters();

  const toggleDisabledMutation = useMutation({
    mutationFn: async ({ userId, isDisabled }: { userId: string; isDisabled: boolean }) => {
      const client = await createHelpdeskApiClient(UsersApi);
      if (isDisabled) {
        // Restore the user
        await client.v1UsersIdRestorePost(userId);
      } else {
        // Disable the user
        await client.v1UsersIdDelete(userId);
      }
    },
    onSuccess: () => {
      addToast({ title: 'User status updated successfully', severity: 'success' });
      refetch();
    },
    onError: () => {
      // Error handled by global axios interceptor
    },
  });

  const handleToggleDisabled = useCallback(
    (userId: string) => {
      const user = items.find(u => u.id === userId);
      if (user) {
        toggleDisabledMutation.mutate({ userId, isDisabled: user.isDisabled ?? false });
      }
    },
    [toggleDisabledMutation, items]
  );

  const columns = useMemo(
    () => createUsersColumns({ onToggleDisabled: handleToggleDisabled }),
    [handleToggleDisabled]
  );

  const { table } = useUsersTable({
    data: items,
    columns,
    totalCount,
    pagination,
    searchTerm: searchTerm ?? '',
    onPaginationChange: setPagination,
  });

  const paginationTemplate = () => {
    const totalPages = Math.max(1, Math.ceil(totalCount / pagination.pageSize));
    return (
      <TablePagination
        totalPages={totalPages}
        currentPage={pagination.pageIndex + 1}
        onPageChange={(page: number) =>
          setPagination(prev => ({ ...prev, pageIndex: page - 1 }))
        }
      />
    );
  };

  return (
    <>
      <Helmet>
        <title>Users</title>
      </Helmet>
      <div className="mb-5">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Users', href: '/users', isCurrent: true },
          ]}
        />

        <div className="mb-5 items-start gap-5 lg:flex">
          <h1 className="text-gray mb-2 text-2xl font-semibold md:mb-0 dark:text-white">
            User Management
          </h1>
        </div>

        <UsersTableFilters table={table} />
      </div>

      <BaseTable
        fullHeight
        table={table}
        showInfo={false}
        paginationTemplate={paginationTemplate}
        isLoading={isLoading}
        loading={{ title: 'Loading...' }}
      />
    </>
  );
}

export default UsersPage;
