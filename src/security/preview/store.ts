/**
 * Which role this browser tab is previewing, and what that role is made of.
 *
 * DEVELOPMENT ONLY. This module is reached solely through
 * src/security/dev-preview.ts, behind `process.env.NODE_ENV === 'development'`,
 * so a production build never contains it.
 *
 * PER TAB
 * The chosen role lives in sessionStorage, which the browser keeps separately
 * for every tab. Two tabs of the same browser can therefore preview two
 * different roles side by side, and a reload keeps the tab's role.
 *
 * THE URL PARAMETER
 * `?previewRole=<role name>` is read once, when this module first loads, copied
 * into sessionStorage and then removed from the address bar. Removing it means
 * "Exit preview" followed by a reload really does exit, instead of the
 * parameter switching the preview straight back on.
 */

export interface PreviewRole {
  /** The identity role name, used in `?previewRole=`. */
  key: string;
  /** What people call it. Falls back to the key. */
  label: string;
  /** Permission names exactly as the context token carries them. */
  permissions: string[];
}

export type PreviewRolesStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface PreviewSnapshot {
  /** The role key this tab asked for, or null when not previewing. */
  roleKey: string | null;
  rolesStatus: PreviewRolesStatus;
  roles: PreviewRole[];
}

const STORAGE_KEY = 'helpdesk:preview-role';
export const PREVIEW_ROLE_PARAM = 'previewRole';

const readStored = (): string | null => {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage can be blocked (private mode, site data off). Preview is then
    // simply unavailable rather than an error.
    return null;
  }
};

const writeStored = (value: string | null): void => {
  try {
    if (value) window.sessionStorage.setItem(STORAGE_KEY, value);
    else window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // See readStored.
  }
};

/** Copies `?previewRole=` into this tab's storage and drops it from the URL. */
const adoptUrlParam = (): void => {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  const fromUrl = url.searchParams.get(PREVIEW_ROLE_PARAM);
  if (fromUrl === null) return;
  writeStored(fromUrl.trim() || null);
  url.searchParams.delete(PREVIEW_ROLE_PARAM);
  // Keeps the router's own history state, so its back and forward still work.
  window.history.replaceState(window.history.state, '', url.toString());
};

adoptUrlParam();

let snapshot: PreviewSnapshot = {
  roleKey: typeof window === 'undefined' ? null : readStored(),
  rolesStatus: 'idle',
  roles: [],
};

const listeners = new Set<() => void>();

const publish = (next: PreviewSnapshot): void => {
  snapshot = next;
  for (const listener of listeners) listener();
};

export const subscribePreview = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getPreviewSnapshot = (): PreviewSnapshot => snapshot;

/** Start previewing `key` in this tab, or stop with null. */
export const setPreviewRole = (key: string | null): void => {
  writeStored(key);
  publish({ ...snapshot, roleKey: key });
};

/** Called by the switcher once the role list has loaded (or failed to). */
export const setPreviewRoles = (
  rolesStatus: PreviewRolesStatus,
  roles: PreviewRole[],
): void => {
  if (snapshot.rolesStatus === rolesStatus && snapshot.roles === roles) return;
  publish({ ...snapshot, rolesStatus, roles });
};
