/*
 * Per-user preferences: one store for every per-user setting (the tickets
 * table layout and the email signature today).
 *
 * Replace with the generated client once it is regenerated. Shapes mirror the
 * backend exactly (design-review/notes/dev/CONTRACTS.md, Ben's section).
 * Keyed by the signed-in user, not by context, so a context switch does not
 * change what comes back. An unset key is a 200 with `value: null`.
 */
import { authorizedAxios } from '@/state/authorizedAxios';
import { requireHelpdeskApiBaseUrl } from '@/state/config';

/** Keys the server accepts; any other key is a 400. */
export type PreferenceKey = 'tickets.list.layout' | 'email.signature';

export interface UserPreferenceDto<T> {
  key: PreferenceKey;
  value: T | null;
  updatedAt: string | null;
}

/** `tickets.list.layout` */
export interface TableLayoutPreference {
  /** Layout version; another version is ignored (see useTableLayout). */
  v: number;
  /** Column ids in display order. Absent on layouts saved as 3. */
  order?: string[];
  /** Hidden column ids. Stored this way so a column added later shows by default. */
  hidden: string[];
  sort: { id: string; desc: boolean } | null;
}

/** `email.signature`. `html` is sanitised by the server on save. */
export interface EmailSignaturePreference {
  html: string;
  addToReplies: boolean;
}

const url = (key: PreferenceKey) =>
  `${requireHelpdeskApiBaseUrl()}/v1/me/preferences/${encodeURIComponent(key)}`;

export const getPreference = async <T>(
  key: PreferenceKey,
): Promise<UserPreferenceDto<T>> => {
  const { data } = await authorizedAxios.get<UserPreferenceDto<T>>(url(key));
  return data;
};

export const putPreference = async <T>(
  key: PreferenceKey,
  value: T,
): Promise<UserPreferenceDto<T>> => {
  const { data } = await authorizedAxios.put<UserPreferenceDto<T>>(url(key), {
    value,
  });
  return data;
};

export const deletePreference = async <T>(
  key: PreferenceKey,
): Promise<UserPreferenceDto<T>> => {
  const { data } = await authorizedAxios.delete<UserPreferenceDto<T>>(url(key));
  return data;
};
