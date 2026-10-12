import { IconTip } from '@/components/shared/IconTip';
import { helpdeskAppQueryOptions } from '@/state/helpdesk-app-query';
import { Icon } from '@brainforgeau/components';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownTrigger,
  toast,
} from '@heroui/react';
import { useQuery } from '@tanstack/react-query';
import { type FC, useEffect } from 'react';
import { previewUrl, toPreviewRoles } from './roles';
import { type PreviewRole, setPreviewRole, setPreviewRoles } from './store';
import { usePreviewState } from './usePreviewPermissions';

/**
 * The "Preview as role" controls. DEVELOPMENT ONLY (see dev-preview.ts).
 *
 * Not previewing: a small "Preview as role" picker pinned to the bottom left.
 * Previewing: a slim banner across the top of the content naming the role,
 * with a switcher and "Exit preview".
 *
 * It also owns loading the role list. The roles come from the shared helpdesk
 * app query (the same one the assignee pickers use), and are handed to the
 * preview store that `usePermissions` reads.
 */

const HONESTY_NOTE =
  'Preview changes what the screens show: menus, buttons, pages, Configuration and bulk actions are decided as this role would see them. It does not change what the server returns. Every request still uses your admin account, so lists can contain rows this role would never receive. The top bar is a separate app and is unaffected.';

let urlsLogged = false;

/** One line per role in the console, to open one tab per role. */
const logRoleUrls = (roles: PreviewRole[]) => {
  if (urlsLogged || roles.length === 0) return;
  urlsLogged = true;
  console.info(
    '[preview-role] Open one tab per role:',
    roles
      .map(
        r => `\n  ${r.label} (${r.permissions.length}): ${previewUrl(r.key)}`,
      )
      .join(''),
  );
};

const copyRoleUrls = async (roles: PreviewRole[]) => {
  const text = roles.map(r => `${r.label}\t${previewUrl(r.key)}`).join('\n');
  try {
    await navigator.clipboard.writeText(text);
    toast.success('Copied one link per role');
  } catch {
    toast.danger('Could not copy. The links are also in the browser console.');
  }
};

const RoleMenu: FC<{
  roles: PreviewRole[];
  currentKey: string | null;
  isLoading: boolean;
  triggerLabel: string;
  triggerClassName: string;
}> = ({ roles, currentKey, isLoading, triggerLabel, triggerClassName }) => (
  <Dropdown>
    <DropdownTrigger
      aria-label="Choose a role to preview"
      className={triggerClassName}
    >
      <span className="truncate">{triggerLabel}</span>
      <Icon name="chevron-down" className="h-3 w-3 shrink-0" />
    </DropdownTrigger>
    <DropdownPopover className="helpdesk-dropdown-popover">
      <DropdownMenu aria-label="Roles to preview">
        {isLoading ? (
          <DropdownItem key="loading" isDisabled>
            Loading roles...
          </DropdownItem>
        ) : roles.length === 0 ? (
          <DropdownItem key="empty" isDisabled>
            No helpdesk roles found
          </DropdownItem>
        ) : (
          [
            ...roles.map(role => (
              <DropdownItem
                key={role.key}
                textValue={role.label}
                onPress={() => setPreviewRole(role.key)}
              >
                <div className="flex flex-col">
                  <span
                    className={role.key === currentKey ? 'font-semibold' : ''}
                  >
                    {role.label}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {role.key} · {role.permissions.length} permissions
                  </span>
                </div>
              </DropdownItem>
            )),
            <DropdownItem
              key="__copy-links"
              textValue="Copy one link per role"
              onPress={() => copyRoleUrls(roles)}
            >
              Copy one link per role
            </DropdownItem>,
          ]
        )}
      </DropdownMenu>
    </DropdownPopover>
  </Dropdown>
);

export const PreviewRoleBanner: FC = () => {
  const { roleKey, roles, rolesStatus, role } = usePreviewState();
  const app = useQuery(helpdeskAppQueryOptions);

  useEffect(() => {
    if (app.isError) {
      setPreviewRoles('error', []);
    } else if (app.isPending) {
      setPreviewRoles('loading', []);
    } else {
      const list = toPreviewRoles(app.data);
      setPreviewRoles('ready', list);
      logRoleUrls(list);
    }
  }, [app.data, app.isError, app.isPending]);

  const isLoading = rolesStatus === 'idle' || rolesStatus === 'loading';

  if (!roleKey) {
    return (
      <div className="fixed bottom-3 left-3 z-50">
        <RoleMenu
          roles={roles}
          currentKey={null}
          isLoading={isLoading}
          triggerLabel="Preview as role"
          triggerClassName="flex items-center gap-1 rounded-md border border-warning-200 bg-warning-50 px-2 py-1 text-xs text-warning-800 shadow-sm hover:bg-warning-100 focus:outline-none focus:ring-2 focus:ring-warning-400"
        />
      </div>
    );
  }

  const message = role
    ? `Previewing as ${role.label}. Screens only: data still comes from your admin account.`
    : rolesStatus === 'error'
      ? `Could not load the helpdesk roles, so "${roleKey}" cannot be previewed. You are seeing your admin view.`
      : isLoading
        ? `Loading the "${roleKey}" role...`
        : `There is no helpdesk role "${roleKey}". You are seeing your admin view.`;

  return (
    <div
      aria-live="polite"
      data-testid="preview-role-banner"
      className="flex items-center gap-2 border-b border-warning-200 bg-warning-50 px-4 py-1 text-xs text-warning-800"
    >
      <Icon name="eye" className="h-3.5 w-3.5 shrink-0" />
      <span className="min-w-0 truncate">{message}</span>
      <IconTip label={HONESTY_NOTE}>
        <button
          type="button"
          aria-label="What preview changes"
          className="shrink-0 rounded p-0.5 hover:bg-warning-100 focus:outline-none focus:ring-2 focus:ring-warning-400"
        >
          <Icon name="info" className="h-3.5 w-3.5" />
        </button>
      </IconTip>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <RoleMenu
          roles={roles}
          currentKey={roleKey}
          isLoading={isLoading}
          triggerLabel="Switch role"
          triggerClassName="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-warning-100 focus:outline-none focus:ring-2 focus:ring-warning-400"
        />
        <button
          type="button"
          onClick={() => setPreviewRole(null)}
          className="rounded border border-warning-200 bg-white/60 px-2 py-0.5 font-medium hover:bg-warning-100 focus:outline-none focus:ring-2 focus:ring-warning-400"
        >
          Exit preview
        </button>
      </div>
    </div>
  );
};
