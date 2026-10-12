import type { AppDto } from '@brainforgeau/identity-management-client';
import type { PreviewRole } from './store';

/**
 * A permission's name as the context token carries it.
 *
 * The token names helpdesk permissions without the app prefix
 * ("tickets.read", see src/constants/permissions.ts). Identity normally
 * stores them in that same form; the two other shapes are handled so a
 * difference in how identity names them shows up as a working preview rather
 * than one that silently denies everything:
 *  - "helpdesk.tickets.read": the prefix is dropped;
 *  - "read" inside the "tickets" resource group: joined to "tickets.read".
 */
const tokenName = (groupName: string | null | undefined, name: string) => {
  if (name.startsWith('helpdesk.')) return name.slice('helpdesk.'.length);
  if (name.includes('.') || !groupName) return name;
  return `${groupName}.${name}`;
};

/**
 * The helpdesk app's roles, each with the permission names it grants, from
 * identity-management's description of the app. Nothing is invented: a role
 * the app does not list cannot be previewed.
 */
export const toPreviewRoles = (
  app: AppDto | null | undefined,
): PreviewRole[] => {
  if (!app) return [];

  const nameById = new Map<string, string>();
  for (const group of app.resourceGroups ?? []) {
    for (const permission of group.permissions ?? []) {
      if (permission.id && permission.name) {
        nameById.set(permission.id, tokenName(group.name, permission.name));
      }
    }
  }

  return (app.roles ?? [])
    .filter(role => !!role.name)
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
    .map(role => {
      const key = role.name as string;
      const permissions = (role.permissionIds ?? [])
        .map(id => nameById.get(id))
        .filter((name): name is string => !!name);
      return {
        key,
        label: role.displayName || key,
        permissions: [...new Set(permissions)].sort(),
      };
    });
};

/** Where to open one tab per role, for the console and the picker. */
export const previewUrl = (key: string): string => {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('previewRole', key);
  return url.toString();
};
