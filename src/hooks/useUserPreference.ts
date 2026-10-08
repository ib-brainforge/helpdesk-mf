import {
  type PreferenceKey,
  type UserPreferenceDto,
  deletePreference,
  getPreference,
  putPreference,
} from '@/api/local/preferences';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef } from 'react';

const SAVE_DELAY_MS = 600;

export const userPreferenceQueryKey = (key: PreferenceKey) =>
  ['user-pref', key] as const;

/**
 * One per-user setting, read once and written back as it changes.
 *
 * The query is deliberately NOT keyed by the context: preferences belong to
 * the person, so switching tenant must not refetch them. Only this user writes
 * them, so the cached value never goes stale (`staleTime: Infinity`).
 *
 * `save` updates the cache at once, so the UI follows the change without
 * waiting, and writes it after a short pause, so dragging a column wider or
 * ticking through the chooser is one request rather than one per step. Pass
 * `{ immediate: true }` for an explicit Save; that call resolves with what the
 * server stored (the signature comes back sanitised) and caches it.
 *
 * A failed read leaves `value` null and still reports ready, so the screen
 * falls back to its defaults instead of waiting forever.
 */
export const useUserPreference = <T>(key: PreferenceKey) => {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => userPreferenceQueryKey(key), [key]);

  const query = useQuery<UserPreferenceDto<T>>({
    queryKey,
    queryFn: () => getPreference<T>(key),
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });

  const pending = useRef<{ value: T } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const put = useMutation({
    mutationFn: (value: T) => putPreference<T>(key, value),
    // A newer change still waiting to go out wins over this older reply.
    onSuccess: saved => {
      if (!pending.current) queryClient.setQueryData(queryKey, saved);
    },
  });
  const remove = useMutation({
    mutationFn: () => deletePreference<T>(key),
    onSuccess: saved => queryClient.setQueryData(queryKey, saved),
  });

  // Latest mutate functions, so the callbacks below stay stable.
  const putRef = useRef(put.mutateAsync);
  putRef.current = put.mutateAsync;
  const removeRef = useRef(remove.mutateAsync);
  removeRef.current = remove.mutateAsync;

  const flush = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = undefined;
    const next = pending.current;
    pending.current = null;
    if (next) void putRef.current(next.value).catch(() => undefined);
  }, []);

  // Leaving the page must not drop the last change.
  useEffect(() => flush, [flush]);

  const save = useCallback(
    async (value: T, { immediate = false } = {}) => {
      queryClient.setQueryData<UserPreferenceDto<T>>(queryKey, prev => ({
        key,
        updatedAt: prev?.updatedAt ?? null,
        value,
      }));
      if (immediate) {
        clearTimeout(timer.current);
        pending.current = null;
        return putRef.current(value);
      }
      pending.current = { value };
      clearTimeout(timer.current);
      timer.current = setTimeout(flush, SAVE_DELAY_MS);
      return undefined;
    },
    [key, queryKey, queryClient, flush],
  );

  const reset = useCallback(() => {
    clearTimeout(timer.current);
    pending.current = null;
    queryClient.setQueryData<UserPreferenceDto<T>>(queryKey, {
      key,
      updatedAt: null,
      value: null,
    });
    return removeRef.current();
  }, [key, queryKey, queryClient]);

  return {
    value: query.data?.value ?? null,
    isReady: !query.isLoading,
    isSaving: put.isPending || remove.isPending,
    save,
    reset,
  };
};
