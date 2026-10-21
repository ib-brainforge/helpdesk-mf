import { useCustomStatuses } from '@/components/custom-statuses/hooks/useCustomStatuses';
import { KbSuggestions } from '@/components/knowledge-base/components/KbSuggestions';
import {
  type BadgeColor,
  StatusBadge,
  UserCell,
  UserOptionRow,
  badgeFieldClasses,
  badgeSwatchClasses,
} from '@/components/shared';
import { SlaIndicator } from '@/components/sla/SlaIndicator';
import {
  useAddTagToTicket,
  useRemoveTagFromTicket,
  useTags,
  useTicketTags,
} from '@/components/tags/hooks/useTags';
import { SUBTASKS_ENABLED, TIME_TRACKING_ENABLED } from '@/constants/features';
import { HelpdeskPermissions } from '@/constants/permissions';
import { useHelpdeskScope } from '@/hooks/useHelpdeskScope';
import { useUserEnrichment } from '@/hooks/useUserEnrichment';
import { usePermissions } from '@/security';
import { PermissionGuard, useAuth, useTimezone } from '@/security';
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
import { Link } from '@modern-js/runtime/router';
import { useAtom } from 'jotai';
import { type FC, useCallback, useEffect, useMemo, useState } from 'react';
import {
  filterAssignees,
  useScopedAssignees,
} from '../hooks/useScopedAssignees';
import { useTicketDetail } from '../hooks/useTickets';
import {
  categoriesMutationAtom,
  mapCategoryToOption,
} from '../state/categories-dropdown-state';
import { getPriorityConfig } from '../ticket-priority-config';
import { getStatusConfig } from '../ticket-status-config';
import { LinkedAssetsSection } from './LinkedAssetsSection';
import {
  CompanyPill,
  OrganisationPill,
  useTicketScopeNames,
} from './ScopePills';

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
  const { hasPermission: hasKbPermission } = usePermissions();
  const canSeeKnowledgeBase = hasKbPermission(
    HelpdeskPermissions.KnowledgeBase.Manage,
  );
  const timezone = useTimezone();
  const currentUserId = useAuth().user?.profile?.sub;
  const statusConfig = getStatusConfig(ticket.status as TicketStatus);

  /*
   * The parent's subject, for the Parent Ticket link below.
   *
   * `useTicketDetail` is gated on a truthy id, so this costs nothing for the
   * common case of a ticket with no parent. It also shares the ['ticket', id]
   * query key, so navigating to the parent reuses this instead of refetching.
   */
  const { data: parentTicket } = useTicketDetail(
    SUBTASKS_ENABLED ? (ticket.parentTicketId ?? '') : '',
  );

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
  // The ticket's own company's statuses: the page runs in its company
  // (TicketScopeProvider), so another company's ticket shows its own.
  const { customStatuses } = useCustomStatuses();
  // Categories are searched in the ticket's company too.
  const scope = useHelpdeskScope();
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
  // Subscribers too, so their avatars show initials and a name rather than
  // the first two characters of an id ("7" for 7648389d).
  const userIds = useMemo(
    () => [
      ticket.requesterId,
      ticket.assigneeId,
      ...(ticket.subscriberIds ?? []),
    ],
    [ticket.requesterId, ticket.assigneeId, ticket.subscriberIds],
  );
  const { userMap } = useUserEnrichment(userIds);
  const requesterDisplayName =
    ticket.requesterName ??
    (ticket.requesterId ? userMap[ticket.requesterId]?.name : undefined) ??
    '—';
  const requesterEmail =
    ticket.emailRecipient?.address ??
    (ticket.requesterId ? userMap[ticket.requesterId]?.email : undefined);
  const { companyName, organisationName } = useTicketScopeNames(
    ticket.tenantId,
    ticket.organisationId,
  );
  const assigneeDisplayName =
    ticket.assigneeName ??
    (ticket.assigneeId ? userMap[ticket.assigneeId]?.name : undefined) ??
    'Unassigned';

  // Tags
  /*
   * The company's tag list (a large response) loads when the Tags picker is
   * first opened or focused, not with every ticket. The ticket's own tags come
   * from useTicketTags and are listed too, so the chips keep their names.
   */
  const [tagsWanted, setTagsWanted] = useState(false);
  const wantTags = useCallback(() => setTagsWanted(true), []);
  const { tags: allTags } = useTags(undefined, { enabled: tagsWanted });
  const { tags: ticketTags, refetch: refetchTicketTags } = useTicketTags(
    ticket.id ?? '',
  );
  const availableTags = useMemo(() => {
    const byId = new Map(allTags.map(t => [t.id, t]));
    for (const t of ticketTags ?? []) if (!byId.has(t.id)) byId.set(t.id, t);
    return [...byId.values()];
  }, [allTags, ticketTags]);
  const addTagMutation = useAddTagToTicket();
  const removeTagMutation = useRemoveTagFromTicket();

  /*
   * Everyone this ticket can be assigned to: people whose helpdesk role reaches
   * the ticket's own tenant, organisation or division, plus anyone already
   * holding tickets there. Scoped to the TICKET, not the viewer's context, so a
   * service admin looking at another tenant's ticket sees that tenant's people.
   * See useScopedAssignees for why both sources are needed.
   */
  const scopedAssignees = useScopedAssignees({
    tenantId: ticket.tenantId,
    organisationId: ticket.organisationId,
    divisionId: ticket.divisionId,
  });
  const [assigneeQuery, setAssigneeQuery] = useState('');

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
    searchCategories({ query: '', scope });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The scope is loaded once and searched here: neither source behind it has
  // a text search, and BaseAutocomplete never filters its own items.
  const usersOptions = useMemo(
    () => filterAssignees(scopedAssignees.options, assigneeQuery),
    [scopedAssignees.options, assigneeQuery],
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
                /*
                  textValue is what the closed trigger renders. These children
                  are a JSX span (colour dot + label), not a plain string, so
                  without it the trigger falls back to the item's key and a
                  custom status showed as the raw wire token
                  "custom:0971f548-fd73-4bfe-8029-346e432baeef".
                */
                <BaseSelectItem
                  key={opt.key}
                  value={opt.key}
                  textValue={opt.label}
                >
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
          fallback={
            <p className="text-sm">{assigneeDisplayName ?? 'Unassigned'}</p>
          }
        >
          <BaseAutocomplete
            placeholder="Unassigned"
            isClearable
            selectedKey={ticket.assigneeId ?? null}
            onSelectionChange={key => {
              const newKey = key as string | null;
              // null, never undefined: undefined means "leave the assignee
              // alone" and the update is skipped entirely.
              onUpdate?.({ assigneeId: newKey ?? null });
            }}
            onClear={() => onUpdate?.({ assigneeId: null })}
            onValueChange={setAssigneeQuery}
            // Closing forgets the search, so reopening starts from everyone.
            onOpenChange={open => {
              if (!open) setAssigneeQuery('');
            }}
            isLoading={scopedAssignees.isLoading}
            isDisabled={isUpdating}
            renderSelectedItem={selectedKey => {
              /*
               * Falls back to the enriched user when the options list has not
               * been fetched.
               *
               * usersOptions is filled by a search that only runs when the
               * dropdown is opened, so on a freshly loaded ticket it is empty.
               * Returning null then rendered an empty control, which read as
               * "unassigned" on a ticket that was in fact assigned. Taking a
               * ticket over looked like it had done nothing: the write
               * succeeded, the button correctly disabled itself, and the field
               * beside it still showed nobody.
               *
               * userMap is the same identity lookup the read-only fallback
               * below already uses, so the name is available without opening
               * anything.
               */
              // The unfiltered list: a search that happens to exclude the
              // current assignee must not blank out their name.
              const user = scopedAssignees.options.find(
                u => u.id === selectedKey,
              );
              const enriched = selectedKey
                ? userMap[selectedKey as string]
                : undefined;
              const name = user?.name ?? enriched?.name;
              if (!name) return null;
              return (
                <div className="flex w-full min-w-0 flex-1 items-center gap-2">
                  <BaseAvatar
                    src={user?.avatarUrl ?? enriched?.avatarUrl}
                    name={name}
                    size="xs"
                  />
                  <span className="truncate text-xs font-medium">{name}</span>
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
          {/* Taking a ticket yourself is the most common assignment, so it is
            one click, as on the list's assignee cell. */}
          {currentUserId && ticket.assigneeId !== currentUserId && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => onUpdate?.({ assigneeId: currentUserId })}
              className="mt-1.5 text-xs text-blue hover:underline disabled:opacity-50"
            >
              Assign to me
            </button>
          )}
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
            selectedKey={ticket.categoryId ?? null}
            // A ticket cannot exist without a category: it can be changed,
            // never cleared.
            onSelectionChange={key => {
              if (key) onUpdate?.({ categoryId: key as string });
            }}
            onValueChange={(value: string) => {
              searchCategories({ query: value, scope });
            }}
            onOpenChange={open => {
              if (open && !isSearchingCategories) {
                searchCategories({ query: '', scope });
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

      {/* Vehicles: the linked assets, moved up beside the fields they qualify. */}
      <LinkedAssetsSection
        ticketId={ticket.id ?? ''}
        tenantId={ticket.tenantId}
        organisationId={ticket.organisationId}
      />

      <div className="border-t pt-6">
        {/* Requester */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-default-700 mb-1">
            Requester
          </label>
          {/* The same person cell as the Tickets list: picture or initials. */}
          {ticket.requesterId || ticket.requesterName ? (
            <UserCell
              userInfo={
                ticket.requesterId ? userMap[ticket.requesterId] : undefined
              }
              fallbackName={ticket.requesterName}
              avatarSize="xs"
            />
          ) : (
            <p className="text-sm">{requesterDisplayName}</p>
          )}
          {requesterEmail && (
            <p className="mt-0.5 break-all pl-8 text-xs text-default-500">
              {requesterEmail}
            </p>
          )}
        </div>

        {/*
          Company and Organisation, both always shown here because they are
          labelled. (The header drops the organisation when it repeats the
          company's name.)
        */}
        {(companyName || organisationName) && (
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <span className="mb-1 block text-sm font-medium text-default-700">
                Company
              </span>
              {companyName && <CompanyPill name={companyName} />}
            </div>
            <div className="min-w-0">
              <span className="mb-1 block text-sm font-medium text-default-700">
                Organisation
              </span>
              {organisationName && <OrganisationPill name={organisationName} />}
            </div>
          </div>
        )}

        {/* Deadline: its "Fix by" row replaces the old Due Date field. */}
        {ticket.deadline && (
          <div className="mb-4 border-t pt-4">
            <SlaIndicator
              deadline={ticket.deadline}
              createdAt={ticket.createdAt}
              companyName={companyName}
              organisationName={organisationName}
            />
          </div>
        )}

        {/* Via (Origin) */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-default-700 mb-1">
            Via
          </label>
          <StatusBadge color={originConfig.color}>
            {originConfig.label}
          </StatusBadge>
        </div>

        {/* Time Spent, switched off with time tracking (TIME_TRACKING_ENABLED). */}
        {TIME_TRACKING_ENABLED && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-default-700 mb-1">
              Time Spent
            </label>
            <p className="text-sm">{formatTimeSpent(ticket.timeSpent)}</p>
          </div>
        )}

        {/* Due Date, only while the backend sends no deadline block. */}
        {!ticket.deadline && ticket.dueDate && (
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
                {ticket.subscriberIds.map((subscriberId: string) => {
                  const person = userMap[subscriberId];
                  return (
                    <span
                      key={subscriberId}
                      title={person?.name ?? 'Unknown user'}
                    >
                      <BaseAvatar
                        name={person?.name ?? '?'}
                        src={person?.avatarUrl}
                        size="xs"
                      />
                    </span>
                  );
                })}
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
            <div
              className={isUpdating ? 'pointer-events-none opacity-50' : ''}
              onPointerDownCapture={wantTags}
              onFocusCapture={wantTags}
            >
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

        {/* Parent ticket */}
        {SUBTASKS_ENABLED && ticket.parentTicketId && (
          <div className="mb-4">
            {/*
              "Subtask of", not "Parent Ticket". Parent is no longer a field
              anyone sets: the only way a ticket gets one is by being created as
              a subtask, so this is a statement about what this ticket IS rather
              than a relationship someone chose, and it reads as the way back up
              rather than as an editable property.
            */}
            <label className="block text-sm font-medium text-default-700 mb-1">
              Subtask of
            </label>
            {/*
              A link, not blue text. This rendered the first 8 characters of the
              parent's GUID styled like a link but with no behaviour: it named
              nothing a reader recognises and could not be followed. The subject
              is what identifies a ticket to a person, so it leads, and the short
              id stays alongside it for anyone matching against a URL or a log.
            */}
            <Link
              to={`/tickets/${ticket.parentTicketId}`}
              className="text-sm text-blue-600 hover:underline"
            >
              {parentTicket?.subject ?? `#${ticket.parentTicketId.slice(0, 8)}`}
              {parentTicket?.subject && (
                <span className="ml-1.5 font-mono text-xs text-default-400">
                  #{ticket.parentTicketId.slice(0, 8)}
                </span>
              )}
            </Link>
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

      {/* Suggested KB Articles — seeded from ticket subject. The knowledge
          base is internal (kb.manage, the same rule as its pages), so the
          suggestions are only shown to people who may open them. */}
      {ticket.subject && canSeeKnowledgeBase && (
        <div className="border-t pt-6">
          <label className="block text-sm font-medium text-default-700 mb-2">
            Suggested KB Articles
          </label>
          <KbSuggestions
            searchText={ticket.subject}
            minChars={3}
            limit={5}
            emptyMessage="No related articles found for this ticket."
          />
        </div>
      )}
    </div>
  );
};
