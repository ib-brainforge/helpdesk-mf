import { PresetPill } from '@/components/shared';
import { useScopedAssignees } from '@/components/tickets/hooks/useScopedAssignees';
import { HelpdeskPermissions } from '@/constants/permissions';
import {
  useProviderCategoryOpenCounts,
  useSetCategoryDefaultAssignee,
} from '@/hooks/useProviderSupport';
import { useUserEnrichment } from '@/hooks/useUserEnrichment';
import { extractErrorMessage } from '@/utils/error-handling';
import { BaseAvatar } from '@brainforgeau/components';
import { EmptyState } from '@brainforgeau/components/page';
import { usePermissions } from '@brainforgeau/security';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownTrigger,
  toast,
} from '@heroui/react';
import { type FC, useMemo } from 'react';

/*
 * The preset categories of the Provider's own office: what customers can raise
 * a request under, who tickets in each go to by default, and how much is open
 * in each. All of it comes from one endpoint (category-open-counts). Staff with
 * categories.manage set the default assignee here; the categories themselves
 * are managed by the platform.
 */

const NO_ASSIGNEE = '__none__';

const Count: FC<{ value: number; late?: boolean }> = ({ value, late }) => (
  <span
    className={`tabular-nums ${
      late && value > 0
        ? 'text-red-dark dark:text-red-400 font-semibold'
        : value === 0
          ? 'text-default-400'
          : ''
    }`}
  >
    {value}
  </span>
);

export const ProviderCategories: FC = () => {
  const presets = useProviderCategoryOpenCounts();
  const { hasPermission } = usePermissions();
  const canAssign = hasPermission(HelpdeskPermissions.Categories.Manage);
  const { options, isLoading: loadingStaff } = useScopedAssignees({});
  const setAssignee = useSetCategoryDefaultAssignee();

  const rows = presets.data ?? [];
  const assigneeIds = useMemo(() => rows.map(c => c.defaultAssigneeId), [rows]);
  const { userMap } = useUserEnrichment(assigneeIds);

  const assign = (categoryId: string, assigneeId: string | null) =>
    setAssignee.mutate(
      { categoryId, assigneeId },
      {
        onSuccess: () =>
          toast(
            assigneeId ? 'Default assignee saved' : 'Default assignee cleared',
            { variant: 'success' },
          ),
        onError: error =>
          toast("Couldn't save the default assignee", {
            description: extractErrorMessage(error, 'Try again.'),
            variant: 'danger',
          }),
      },
    );

  if (!presets.isLoading && rows.length === 0) {
    return (
      <EmptyState
        title={
          presets.isError
            ? "Couldn't load the Provider categories"
            : 'No Provider categories yet'
        }
        description={
          presets.isError
            ? 'Reload the page to try again.'
            : 'Preset categories are added by the platform and appear here once they are open to your customers.'
        }
        live
      />
    );
  }

  return (
    <div className="border-default-200 overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-default-50 text-default-600 text-left text-xs font-semibold">
          <tr>
            <th className="px-3 py-2.5">Category</th>
            <th className="px-3 py-2.5">Default assignee</th>
            <th className="px-3 py-2.5 text-right">Open with Provider</th>
            <th className="px-3 py-2.5 text-right">Overdue</th>
            <th className="px-3 py-2.5 text-right">Open in customers</th>
            <th className="px-3 py-2.5 text-right">Overdue</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(c => {
            const id = c.categoryId ?? '';
            const assigneeId = c.defaultAssigneeId;
            const current = assigneeId
              ? (userMap[assigneeId]?.name ??
                options.find(o => o.id === assigneeId)?.name ??
                'Assigned')
              : null;
            return (
              <tr key={id} className="border-default-200 border-t">
                <td className="px-3 py-2 align-top">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{c.name}</span>
                    <PresetPill hint="A category the Provider offers every customer. Customers use it but cannot change it." />
                  </div>
                  {c.description && (
                    <p className="text-default-500 text-xs">{c.description}</p>
                  )}
                </td>
                <td className="px-3 py-2 align-top">
                  {canAssign ? (
                    <Dropdown>
                      <DropdownTrigger
                        aria-label={`Default assignee for ${c.name}`}
                        className="text-gray hover:bg-light-blue hover:text-blue focus:ring-blue -ml-1 rounded-[3px] px-1.5 py-0.5 text-sm transition-colors focus:outline-none focus:ring-2"
                      >
                        {current ?? (
                          <span className="text-muted-foreground">
                            No default assignee
                          </span>
                        )}
                      </DropdownTrigger>
                      <DropdownPopover className="helpdesk-dropdown-popover">
                        <DropdownMenu
                          aria-label={`Default assignee for ${c.name}`}
                          onAction={key =>
                            assign(id, key === NO_ASSIGNEE ? null : String(key))
                          }
                        >
                          {[
                            <DropdownItem key={NO_ASSIGNEE}>
                              No default assignee
                            </DropdownItem>,
                            ...(loadingStaff
                              ? [
                                  <DropdownItem key="loading" isDisabled>
                                    Loading team...
                                  </DropdownItem>,
                                ]
                              : options.map(user => (
                                  <DropdownItem
                                    key={user.id}
                                    textValue={user.name}
                                  >
                                    <div className="flex items-center gap-2">
                                      <BaseAvatar
                                        src={user.avatarUrl}
                                        name={user.name}
                                        size="xs"
                                      />
                                      <span className="truncate">
                                        {user.name}
                                      </span>
                                    </div>
                                  </DropdownItem>
                                ))),
                          ]}
                        </DropdownMenu>
                      </DropdownPopover>
                    </Dropdown>
                  ) : (
                    <span className={current ? '' : 'text-muted-foreground'}>
                      {current ?? 'No default assignee'}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right align-top">
                  <Count value={c.openWithProvider ?? 0} />
                </td>
                <td className="px-3 py-2 text-right align-top">
                  <Count value={c.overdueWithProvider ?? 0} late />
                </td>
                <td className="px-3 py-2 text-right align-top">
                  <Count value={c.openInCustomers ?? 0} />
                </td>
                <td className="px-3 py-2 text-right align-top">
                  <Count value={c.overdueInCustomers ?? 0} late />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
