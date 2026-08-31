import { useCustomStatuses } from '@/components/custom-statuses/hooks/useCustomStatuses';
import { KbSuggestions } from '@/components/knowledge-base/components/KbSuggestions';
import {
  type BadgeColor,
  StatusBadge,
  UserOptionRow,
  badgeFieldClasses,
  badgeSwatchClasses,
} from '@/components/shared';
import {
  useAddTagToTicket,
  useRemoveTagFromTicket,
  useTags,
  useTicketTags,
} from '@/components/tags/hooks/useTags';
import { HelpdeskPermissions } from '@/constants/permissions';
import { useUserEnrichment } from '@/hooks/useUserEnrichment';
import {
  buildStatusOptions,
  encodeCustomStatusKey,
  resolveStatusKey,
  toTicketStatusName,
} from '@/types/custom-status';
import {
  type TicketDto,
  TicketPriority,
  type TicketStatus,
} from '@/types/ticket';
import {
  BaseAutocomplete,
  BaseAutocompleteItem,
  BaseAvatar,
  BaseButton,
  BaseSelect,
  BaseSelectItem,
  BaseTagSelect,
  BaseTagSelectItem,
} from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import { formatDateTime } from '@brainforgeau/components/utils';
import { PermissionGuard, useTimezone } from '@brainforgeau/security';
import { useAtom } from 'jotai';
import { type FC, useCallback, useEffect, useMemo } from 'react';
import {
  categoriesMutationAtom,
  mapCategoryToOption,
} from '../state/categories-dropdown-state';
import {
  mapUserToOption,
  usersMutationAtom,
} from '../state/users-dropdown-state';
import { getPriorityConfig } from '../ticket-priority-config';
import { getStatusConfig } from '../ticket-status-config';
import { LinkedAssetsSection } from './LinkedAssetsSection';

interface TicketDetailSidebarProps {
  ticket: TicketDto;
  onUpdate?: (updates: Partial<TicketDto>) => void;
  isUpdating?: boolean;
  isSubscribed?: boolean;
  isSubscribeLoading?: boolean;
  onSubscribeToggle?: () => void;
}

const getOriginConfig = (origin: string) => {
  switch (origin) {
    case 'Web':
      return { label: 'Web', color: 'primary' as const };
    case 'Email':
      return { label: 'Email', color: 'secondary' as const };
    case 'Api':
      return { label: 'API', color: 'success' as const };
    default:
      return { label: origin || 'Unknown', color: 'default' as const };
  }
};

const formatTimeSpent = (timeSpan: string | undefined) => {
  if (!timeSpan) return '0h 0m';

  // Parse TimeSpan format: "HH:MM:SS" or duration in seconds
  if (typeof timeSpan === 'string' && timeSpan.includes(':')) {
    const parts = timeSpan.split(':');
    const hours = Number.parseInt(parts[0] || '0', 10);
    const minutes = Number.parseInt(parts[1] || '0', 10);
    return `${hours}h ${minutes}m`;
  }

  return timeSpan || '0h 0m';
};

/**
 * Colour dot for a status or priority option.
 *
 * The header used to carry a coloured badge for both fields. It was removed as
 * a duplicate of the controls here, so the colour has to live in the controls
 * or it is lost: the dropdown list is where someone compares options, and a
 * plain list of words makes "Critical" look like any other choice.
 *
 * `hex` is for tenant-defined statuses, which bring their own colour and have
 * no place in the fixed badge palette.
 */
const OptionDot = ({ color, hex }: { color?: BadgeColor; hex?: string }) => (
  <span
    aria-hidden
    className={`inline-block h-2 w-2 shrink-0 rounded-full ${hex ? '' : badgeSwatchClasses[color ?? 'default']}`}
    style={hex ? { backgroundColor: hex } : undefined}
  />
);

export const TicketDetailSidebar: FC<TicketDetailSidebarProps> = ({
  ticket,
  onUpdate,
  isUpdating = false,
  isSubscribed = false,
  isSubscribeLoading = false,
  onSubscribeToggle,
}) => {
  const timezone = useTimezone();
  const statusConfig = getStatusConfig(ticket.status as TicketStatus);

  /*
   * Tenant-defined statuses belong in this picker alongside the three built-in
   * ones. They were reachable from Configuration and from the grid's status
   * filter, but never from the ticket itself, so one could be defined and
   * filtered on yet never actually applied to anything.
   *
   * Inactive ones are excluded: retiring a status should stop it being chosen
   * without rewriting the tickets already on it, which is why the ticket's
   * current status is added back below even when inactive.
   */
  const { customStatuses } = useCustomStatuses();
  const statusOptions = useMemo(
    () => buildStatusOptions(customStatuses, ticket.customStatusId),
    [customStatuses, ticket.customStatusId],
  );

  // A custom status wins the display: it is the more specific of the two, and
  // showing "In Progress" for a ticket the tenant calls something else is the
  // bug this picker had in the first place.
  const currentCustomStatus = customStatuses.find(
    cs => cs.id === ticket.customStatusId,
  );

  const handleStatusChange = useCallback(
    (key: string) => {
      const resolved = resolveStatusKey(key, customStatuses);
      // null means the custom status vanished between render and click.
      if (!resolved) return;
      onUpdate?.({
        status: resolved.status as TicketStatus,
        customStatusId: resolved.customStatusId,
      });
    },
    [customStatuses, onUpdate],
  );
  const priorityConfig = getPriorityConfig(ticket.priority as TicketPriority);
  const originConfig = getOriginConfig(ticket.origin ?? '');

  // Resolve requester / assignee names: prefer the names provided natively by
  // the generated client, falling back to identity enrichment by id (mirrors
  // the ticket grid behaviour) so the sidebar never shows a bare "—".
  const userIds = useMemo(
    () => [ticket.requesterId, ticket.assigneeId],
    [ticket.requesterId, ticket.assigneeId],
  );
  const { userMap } = useUserEnrichment(userIds);
  const requesterDisplayName =
    ticket.requesterName ??
    (ticket.requesterId ? userMap[ticket.requesterId]?.name : undefined) ??
    '—';
  const assigneeDisplayName =
    ticket.assigneeName ??
    (ticket.assigneeId ? userMap[ticket.assigneeId]?.name : undefined) ??
    'Unassigned';

  // Tags
  const { tags: availableTags } = useTags();
  const { tags: ticketTags, refetch: refetchTicketTags } = useTicketTags(
    ticket.id ?? '',
  );
  const addTagMutation = useAddTagToTicket();
  const removeTagMutation = useRemoveTagFromTicket();

  // Users search mutation for assignee autocomplete
  const [
    { mutate: searchUsers, data: usersData, isPending: isSearchingUsers },
  ] = useAtom(usersMutationAtom);

  // Categories search mutation for category autocomplete
  const [
    {
      mutate: searchCategories,
      data: categoriesData,
      isPending: isSearchingCategories,
    },
  ] = useAtom(categoriesMutationAtom);

  // Load initial data when component mounts
  useEffect(() => {
    searchUsers({ query: '' });
    searchCategories({ query: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Map data to options
  const usersOptions = useMemo(
    () => (usersData ?? []).map(mapUserToOption),
    [usersData],
  );

  const categoriesOptions = useMemo(
    () => (categoriesData ?? []).map(mapCategoryToOption),
    [categoriesData],
  );

  const handleTagsChange = useCallback(
    async (newTagIds: string[]) => {
      const currentTagIds = ticketTags?.map(t => t.id) ?? [];
      const added = newTagIds.filter(id => !currentTagIds.includes(id));
      const removed = currentTagIds.filter(id => !newTagIds.includes(id));

      for (const tagId of added) {
        await addTagMutation.mutateAsync({ ticketId: ticket.id ?? '', tagId });
      }

      for (const tagId of removed) {
        await removeTagMutation.mutateAsync({
          ticketId: ticket.id ?? '',
          tagId,
        });
      }

      await refetchTicketTags();
    },
    [
      ticket.id,
      ticketTags,
      addTagMutation,
      removeTagMutation,
      refetchTicketTags,
    ],
  );

  return (
    <div className="space-y-6">
      {/* Status */}
      <div>
        <label className="block text-sm font-medium text-default-700 mb-2">
          Status
        </label>
        <PermissionGuard
          requiredPermissions={[HelpdeskPermissions.TicketWrite]}
          fallback={
            <StatusBadge color={statusConfig.color}>
              {currentCustomStatus?.name ?? statusConfig.label}
            </StatusBadge>
          }
        >
          <BaseSelect
            classNames={{ trigger: badgeFieldClasses[statusConfig.color] }}
            selectedKey={
              ticket.customStatusId
                ? encodeCustomStatusKey(ticket.customStatusId)
                : (ticket.status?.toString() ?? '')
            }
            onSelectionChange={keys => {
              if (typeof keys === 'string') {
                handleStatusChange(keys);
              }
            }}
            isDisabled={isUpdating}
          >
            {statusOptions.map(opt => {
              const custom = customStatuses.find(
                cs => encodeCustomStatusKey(cs.id) === opt.key,
              );
              return (
                <BaseSelectItem key={opt.key} value={opt.key}>
                  <span className="flex items-center gap-2">
                    <OptionDot
                      hex={custom?.color}
                      color={
                        getStatusConfig(
                          // mapsToStatus lives in the NUMERIC enum space while
                          // getStatusConfig takes the string one; see the
                          // two-enum note on toTicketStatusName.
                          (custom
                            ? toTicketStatusName(custom.mapsToStatus)
                            : opt.key) as TicketStatus,
                        ).color
                      }
                    />
                    {opt.label}
                  </span>
                </BaseSelectItem>
              );
            })}
          </BaseSelect>
        </PermissionGuard>
      </div>

      {/* Priority */}
      <div>
        <label className="block text-sm font-medium text-default-700 mb-2">
          Priority
        </label>
        <PermissionGuard
          requiredPermissions={[HelpdeskPermissions.TicketWrite]}
          fallback={
            <StatusBadge color={priorityConfig.color}>
              {priorityConfig.label}
            </StatusBadge>
          }
        >
          <BaseSelect
            classNames={{ trigger: badgeFieldClasses[priorityConfig.color] }}
            selectedKey={ticket.priority?.toString() ?? ''}
            onSelectionChange={keys => {
              if (typeof keys === 'string') {
                onUpdate?.({ priority: keys as TicketPriority });
              }
            }}
            isDisabled={isUpdating}
          >
            <BaseSelectItem
              key={TicketPriority.Critical}
              value={TicketPriority.Critical}
            >
              Critical
            </BaseSelectItem>
            <BaseSelectItem
              key={TicketPriority.High}
              value={TicketPriority.High}
            >
              High
            </BaseSelectItem>
            <BaseSelectItem
              key={TicketPriority.Normal}
              value={TicketPriority.Normal}
            >
              Normal
            </BaseSelectItem>
            <BaseSelectItem key={TicketPriority.Low} value={TicketPriority.Low}>
              Low
            </BaseSelectItem>
            {/* No "None" option: it means nothing that Low does not already
                mean, and both rendered as the same grey badge, so it was a
                choice with no distinct meaning. The enum member is kept so any
                historical or imported ticket still renders. */}
          </BaseSelect>
        </PermissionGuard>
      </div>

      {/* Assignee */}
      <div>
        <label className="block text-sm font-medium text-default-700 mb-2">
          Assignee
        </label>
        <PermissionGuard
          requiredPermissions={[HelpdeskPermissions.TicketAssign]}
          fallback={<p className="text-sm">{assigneeDisplayName}</p>}
        >
          <BaseAutocomplete
            placeholder="Search assignee..."
            isClearable
            selectedKey={ticket.assigneeId ?? null}
            onSelectionChange={key => {
              const newKey = key as string | null;
              // null, never undefined: undefined means "leave the assignee
              // alone" and the update is skipped entirely.
              onUpdate?.({ assigneeId: newKey ?? null });
            }}
            onClear={() => onUpdate?.({ assigneeId: null })}
            onValueChange={(value: string) => {
              searchUsers({ query: value });
            }}
            onOpenChange={open => {
              if (open && !isSearchingUsers) {
                searchUsers({ query: '' });
              }
            }}
            isLoading={isSearchingUsers}
            isDisabled={isUpdating}
            renderSelectedItem={selectedKey => {
              const user = usersOptions.find(u => u.id === selectedKey);
              if (!user) return null;
              return (
                <div className="flex w-full min-w-0 flex-1 items-center gap-2">
                  <BaseAvatar src={user.avatarUrl} name={user.name} size="xs" />
                  <span className="truncate text-xs font-medium">
                    {user.name}
                  </span>
                </div>
              );
            }}
          >
            {usersOptions.map(user => (
              <BaseAutocompleteItem
                key={user.id}
                id={user.id}
                textValue={user.name}
              >
                <UserOptionRow
                  name={user.name}
                  email={user.email}
                  avatarUrl={user.avatarUrl}
                />
              </BaseAutocompleteItem>
            ))}
          </BaseAutocomplete>
        </PermissionGuard>
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-default-700 mb-2">
          Category
        </label>
        <PermissionGuard
          requiredPermissions={[HelpdeskPermissions.TicketWrite]}
          fallback={<p className="text-sm">{ticket.categoryName ?? '—'}</p>}
        >
          <BaseAutocomplete
            placeholder="Search category..."
            isClearable
            selectedKey={ticket.categoryId ?? null}
            onSelectionChange={key => {
              const newKey = key as string | null;
              onUpdate?.({ categoryId: newKey ?? undefined });
            }}
            onClear={() => onUpdate?.({ categoryId: undefined })}
            onValueChange={(value: string) => {
              searchCategories({ query: value });
            }}
            onOpenChange={open => {
              if (open && !isSearchingCategories) {
                searchCategories({ query: '' });
              }
            }}
            isLoading={isSearchingCategories}
            isDisabled={isUpdating}
            renderSelectedItem={selectedKey => {
              const category = categoriesOptions.find(
                c => c.id === selectedKey,
              );
              if (!category) return null;
              return (
                <span className="truncate text-xs font-medium">
                  {category.sectionName
                    ? `${category.sectionName} / ${category.name}`
                    : category.name}
                </span>
              );
            }}
          >
            {categoriesOptions.map(category => (
              <BaseAutocompleteItem
                key={category.id}
                id={category.id}
                textValue={
                  category.sectionName
                    ? `${category.sectionName} / ${category.name}`
                    : category.name
                }
              >
                <div className="flex flex-col">
                  <span className="text-xs text-[#59636E] dark:text-white">
                    {category.name}
                  </span>
                  {category.sectionName && (
                    <span className="text-[10px] text-[#8C8F97] dark:text-default-400">
                      {category.sectionName}
                    </span>
                  )}
                </div>
              </BaseAutocompleteItem>
            ))}
          </BaseAutocomplete>
        </PermissionGuard>
      </div>

      <div className="border-t pt-6">
        {/* Requester */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-default-700 mb-1">
            Requester
          </label>
          <p className="text-sm">{requesterDisplayName}</p>
        </div>

        {/* Via (Origin) */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-default-700 mb-1">
            Via
          </label>
          <StatusBadge color={originConfig.color}>
            {originConfig.label}
          </StatusBadge>
        </div>

        {/* Time Spent */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-default-700 mb-1">
            Time Spent
          </label>
          <p className="text-sm">{formatTimeSpent(ticket.timeSpent)}</p>
        </div>

        {/* Due Date */}
        {ticket.dueDate && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-default-700 mb-1">
              Due Date
            </label>
            <p className="text-sm">
              {formatDateTime(ticket.dueDate, { timezone })}
            </p>
          </div>
        )}

        {/* Started At */}
        {ticket.startedAtUtc && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-default-700 mb-1">
              Started At
            </label>
            <p className="text-sm">
              {formatDateTime(ticket.startedAtUtc, { timezone })}
            </p>
          </div>
        )}

        {/* Closed At */}
        {ticket.closedAtUtc && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-default-700 mb-1">
              Closed At
            </label>
            <p className="text-sm">
              {formatDateTime(ticket.closedAtUtc, { timezone })}
            </p>
          </div>
        )}

        {/* Created */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-default-700 mb-1">
            Created
          </label>
          <p className="text-sm">
            {formatDateTime(ticket.createdAt, { timezone })}
          </p>
        </div>

        {/* Updated */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-default-700 mb-1">
            Updated
          </label>
          <p className="text-sm">
            {formatDateTime(ticket.updatedAt, { timezone })}
          </p>
        </div>

        {/* Subscribers */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-default-700">
              Subscribers
            </label>
            {onSubscribeToggle && (
              <BaseButton
                size="sm"
                variant={isSubscribed ? 'ghost' : 'bordered'}
                color={isSubscribed ? 'primary' : undefined}
                onPress={onSubscribeToggle}
                isDisabled={isSubscribeLoading}
                icon={
                  <Icon
                    name={isSubscribed ? 'bell' : 'bell-slash'}
                    className="h-3.5 w-3.5"
                  />
                }
              >
                {isSubscribed ? 'Subscribed' : 'Subscribe me'}
              </BaseButton>
            )}
          </div>
          {ticket.subscriberIds && ticket.subscriberIds.length > 0 ? (
            <>
              <div className="flex flex-wrap gap-2 mt-2">
                {ticket.subscriberIds.map((subscriberId: string) => (
                  <BaseAvatar
                    key={subscriberId}
                    name={subscriberId.substring(0, 2).toUpperCase()}
                    size="xs"
                  />
                ))}
              </div>
              <p className="text-xs text-default-500 mt-2">
                {ticket.subscriberIds.length} subscriber
                {ticket.subscriberIds.length !== 1 ? 's' : ''}
              </p>
            </>
          ) : (
            <p className="text-xs text-default-500 mt-1">No subscribers yet.</p>
          )}
        </div>

        {/* Tags */}
        <div>
          <PermissionGuard
            requiredPermissions={[HelpdeskPermissions.TicketWrite]}
            fallback={
              ticket.tags && ticket.tags.length > 0 ? (
                <div>
                  <label className="block text-sm font-medium text-default-700 mb-2">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ticket.tags.map(tag => (
                      <StatusBadge key={tag}>{tag}</StatusBadge>
                    ))}
                  </div>
                </div>
              ) : null
            }
          >
            <div className={isUpdating ? 'pointer-events-none opacity-50' : ''}>
              <BaseTagSelect
                label="Tags"
                placeholder="Select tags..."
                value={ticketTags?.map(t => t.id) ?? []}
                onValueChange={handleTagsChange}
              >
                {availableTags.map(tag => (
                  <BaseTagSelectItem key={tag.id} value={tag.id}>
                    {tag.name}
                  </BaseTagSelectItem>
                ))}
              </BaseTagSelect>
            </div>
          </PermissionGuard>
        </div>
      </div>

      {/* Recurring - Placeholder */}
      <div className="border-t pt-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-default-700 mb-1">
            Recurring
          </label>
          <p className="text-sm text-default-500">None</p>
        </div>

        {/* Assets */}
        <LinkedAssetsSection ticketId={ticket.id ?? ''} />

        {/* Parent ticket */}
        {ticket.parentTicketId && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-default-700 mb-1">
              Parent Ticket
            </label>
            <p className="text-sm font-mono text-blue-600">
              #{ticket.parentTicketId?.substring(0, 8)}
            </p>
          </div>
        )}
      </div>

      {/* Custom Fields */}
      {ticket.customFields && ticket.customFields.length > 0 && (
        <div className="border-t pt-6">
          <label className="block text-sm font-medium text-default-700 mb-2">
            Custom Fields
          </label>
          <div className="space-y-2">
            {ticket.customFields.map(field => (
              <div key={field.fieldId}>
                <label className="block text-xs text-default-500">
                  {field.fieldName}
                </label>
                <p className="text-sm">{field.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggested KB Articles — seeded from ticket subject */}
      {ticket.subject && (
        <div className="border-t pt-6">
          <label className="block text-sm font-medium text-default-700 mb-2">
            Suggested KB Articles
          </label>
          <KbSuggestions searchText={ticket.subject} minChars={3} limit={5} />
        </div>
      )}
    </div>
  );
};
