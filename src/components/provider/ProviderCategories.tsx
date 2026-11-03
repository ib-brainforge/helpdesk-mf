import { PresetPill, UserOptionRow } from '@/components/shared';
import { moreAssigneesItem } from '@/components/tickets/components/moreAssigneesItem';
import { useScopedAssignees } from '@/components/tickets/hooks/useScopedAssignees';
import { HelpdeskPermissions } from '@/constants/permissions';
import {
  useProviderCategoryOpenCounts,
  useSetCategoryDefaultAssignee,
} from '@/hooks/useProviderSupport';
import { useUserEnrichment } from '@/hooks/useUserEnrichment';
import { extractErrorMessage } from '@/utils/error-handling';
import {
  BaseAutocomplete,
  BaseAutocompleteItem,
  BaseAvatar,
} from '@brainforgeau/components';
import { EmptyState } from '@brainforgeau/components/page';
import { usePermissions } from '@brainforgeau/security';
import { toast } from '@heroui/react';
import { type FC, useMemo, useState } from 'react';

/*
 * The preset categories of the Provider's own office: what tenants can raise
 * a request under, who tickets in each go to by default, and how much is open
 * in each. All of it comes from one endpoint (category-open-counts). Staff with
 * categories.manage set the default assignee here; the categories themselves
 * are managed by the platform.
 */

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

/**
 * One category's default-assignee picker. Searched on the server, so everyone
 * assignable is reachable by typing. Nothing loads until it is first opened;
 * while closed the label comes from the page's existing name lookup.
 * Clearing the field means no default assignee.
 */
const DefaultAssigneePicker: FC<{
  categoryName: string;
  assigneeId: string | null;
  /** The name shown while closed, from the existing enrichment lookup. */
  currentName: string | null;
  onChange: (assigneeId: string | null) => void;
}> = ({ categoryName, assigneeId, currentName, onChange }) => {
  const [hasOpened, setHasOpened] = useState(false);
  const [query, setQuery] = useState('');
  const selectedIds = useMemo(
    () => (assigneeId ? [assigneeId] : []),
    [assigneeId],
  );
  const { options, isLoading, hasMore } = useScopedAssignees(
    {},
    { enabled: hasOpened, search: query, selectedIds },
  );
  return (
    <BaseAutocomplete
      aria-label={`Default assignee for ${categoryName}`}
      placeholder="No default assignee"
      isClearable
      selectedKey={assigneeId}
      onSelectionChange={key => {
        const next = (key as string | null) ?? null;
        if (next !== assigneeId && next !== '__more__') onChange(next);
      }}
      onValueChange={setQuery}
      onOpenChange={open => {
        if (open) setHasOpened(true);
        else setQuery('');
      }}
      isLoading={isLoading}
      renderSelectedItem={selectedKey => {
        const name =
          options.find(u => u.id === selectedKey)?.name ?? currentName;
        if (!name) return null;
        return (
          <div className="flex w-full min-w-0 flex-1 items-center gap-2">
            <BaseAvatar name={name} size="xs" />
            <span className="truncate text-xs font-medium">{name}</span>
          </div>
        );
      }}
    >
      {[
        ...options.map(user => (
          <BaseAutocompleteItem
            key={user.id}
            id={user.id}
            textValue={user.name}
          >
            <UserOptionRow name={user.name} email={user.email} />
          </BaseAutocompleteItem>
        )),
        ...(hasMore ? [moreAssigneesItem()] : []),
      ]}
    </BaseAutocomplete>
  );
};

export const ProviderCategories: FC = () => {
  const presets = useProviderCategoryOpenCounts();
  const { hasPermission } = usePermissions();
  const canAssign = hasPermission(HelpdeskPermissions.Categories.Manage);
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
            : 'Preset categories are added by the platform and appear here once they are open to your tenants.'
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
            <th className="px-3 py-2.5 text-right">Open in tenants</th>
            <th className="px-3 py-2.5 text-right">Overdue</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(c => {
            const id = c.categoryId ?? '';
            const assigneeId = c.defaultAssigneeId;
            const current = assigneeId
              ? (userMap[assigneeId]?.name ?? 'Assigned')
              : null;
            return (
              <tr key={id} className="border-default-200 border-t">
                <td className="px-3 py-2 align-top">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{c.name}</span>
                    <PresetPill hint="A category the Provider offers every tenant. Tenants use it but cannot change it." />
                  </div>
                  {c.description && (
                    <p className="text-default-500 text-xs">{c.description}</p>
                  )}
                </td>
                <td className="px-3 py-2 align-top">
                  {canAssign ? (
                    <DefaultAssigneePicker
                      categoryName={c.name ?? 'category'}
                      assigneeId={assigneeId ?? null}
                      currentName={current}
                      onChange={next => assign(id, next)}
                    />
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
