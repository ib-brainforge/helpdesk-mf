import {
  getCategoryOpenCounts,
  setCategoryDefaultAssignee,
} from '@/api/local/categories';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

/**
 * Open tickets per category, as a lookup. One grouped request for the whole
 * table, never one per row. Principal staff only: the counts span companies.
 */
export const useCategoryOpenCounts = (principalId?: string) => {
  const { data, isLoading } = useQuery({
    queryKey: ['category-open-counts', principalId],
    queryFn: () => getCategoryOpenCounts(principalId as string),
    enabled: Boolean(principalId),
    staleTime: 60_000,
  });
  const counts = useMemo(
    () => new Map((data ?? []).map(c => [c.categoryId, c.openTickets])),
    [data],
  );
  return { counts: principalId ? counts : undefined, isLoading };
};

/** Sets a category's default assignee (a global Netcorp routing rule). */
export const useSetCategoryDefaultAssignee = (principalId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      categoryId,
      assigneeId,
    }: {
      categoryId: string;
      assigneeId: string | null;
    }) =>
      setCategoryDefaultAssignee(principalId as string, categoryId, assigneeId),
    onSuccess: () => {
      // The field rides on both lists the page merges: owned and presets.
      queryClient.invalidateQueries({ queryKey: ['helpdesk-categories'] });
      queryClient.invalidateQueries({ queryKey: ['preset-categories'] });
    },
  });
};
