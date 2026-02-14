import { type FC, useCallback, useMemo, useEffect } from 'react';
import {
  BaseSelect,
  BaseSelectItem,
  BaseAutocomplete,
  BaseAutocompleteItem,
  BaseAvatar,
} from '@brainforgeau/components';
import { PermissionGuard } from '@brainforgeau/security';
import { StatusBadge } from '@/components/shared';
import { TicketStatus, TicketPriority, type TicketDto } from '@/types/ticket';
import { useTags, useTicketTags, useAddTagToTicket, useRemoveTagFromTicket } from '@/components/tags/hooks/useTags';
import { HelpdeskPermissions } from '@/constants/permissions';
import { useAtom } from 'jotai';
import { usersMutationAtom, mapUserToOption } from '../state/users-dropdown-state';
import { categoriesMutationAtom, mapCategoryToOption } from '../state/categories-dropdown-state';

interface TicketDetailSidebarProps {
  ticket: TicketDto;
  onUpdate?: (updates: Partial<TicketDto>) => void;
  isUpdating?: boolean;
}

const getStatusConfig = (status: TicketStatus) => {
  switch (status) {
    case TicketStatus.New:
      return { label: 'New', color: 'primary' as const };
    case TicketStatus.InProgress:
      return { label: 'In Progress', color: 'warning' as const };
    case TicketStatus.Closed:
      return { label: 'Closed', color: 'success' as const };
    default:
      return { label: 'Unknown', color: 'default' as const };
  }
};

const getPriorityConfig = (priority: TicketPriority) => {
  switch (priority) {
    case TicketPriority.Critical:
      return { label: 'Critical', color: 'danger' as const };
    case TicketPriority.High:
      return { label: 'High', color: 'warning' as const };
    case TicketPriority.Normal:
      return { label: 'Normal', color: 'primary' as const };
    case TicketPriority.Low:
      return { label: 'Low', color: 'default' as const };
    case TicketPriority.None:
      return { label: 'None', color: 'default' as const };
    default:
      return { label: 'Unknown', color: 'default' as const };
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const TicketDetailSidebar: FC<TicketDetailSidebarProps> = ({
  ticket,
  onUpdate,
  isUpdating = false,
}) => {
  const statusConfig = getStatusConfig(ticket.status as any);
  const priorityConfig = getPriorityConfig(ticket.priority as any);

  // Tags
  const { tags: availableTags } = useTags();
  const { tags: ticketTags, refetch: refetchTicketTags } = useTicketTags(ticket.id ?? '');
  const addTagMutation = useAddTagToTicket();
  const removeTagMutation = useRemoveTagFromTicket();

  // Users search mutation for assignee autocomplete
  const [{ mutate: searchUsers, data: usersData, isPending: isSearchingUsers }] = useAtom(usersMutationAtom);

  // Categories search mutation for category autocomplete
  const [{ mutate: searchCategories, data: categoriesData, isPending: isSearchingCategories }] = useAtom(categoriesMutationAtom);

  // Load initial data when component mounts
  useEffect(() => {
    searchUsers({ query: '' });
    searchCategories({ query: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Map data to options
  const usersOptions = useMemo(
    () => (usersData ?? []).map(mapUserToOption),
    [usersData]
  );

  const categoriesOptions = useMemo(
    () => (categoriesData ?? []).map(mapCategoryToOption),
    [categoriesData]
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
        await removeTagMutation.mutateAsync({ ticketId: ticket.id ?? '', tagId });
      }

      await refetchTicketTags();
    },
    [ticket.id, ticketTags, addTagMutation, removeTagMutation, refetchTicketTags]
  );

  return (
    <div className="space-y-6">
      {/* Status */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
        <PermissionGuard
          requiredPermissions={[HelpdeskPermissions.TicketWrite]}
          fallback={<StatusBadge color={statusConfig.color}>{statusConfig.label}</StatusBadge>}
        >
          <BaseSelect
            selectedKeys={new Set([ticket.status?.toString() ?? ''])}
            onSelectionChange={(keys) => {
              const value = Array.from(keys)[0] as string;
              onUpdate?.({ status: value as any });
            }}
            isDisabled={isUpdating}
          >
            <BaseSelectItem key={TicketStatus.New.toString()}>New</BaseSelectItem>
            <BaseSelectItem key={TicketStatus.InProgress.toString()}>In Progress</BaseSelectItem>
            <BaseSelectItem key={TicketStatus.Closed.toString()}>Closed</BaseSelectItem>
          </BaseSelect>
        </PermissionGuard>
      </div>

      {/* Priority */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
        <PermissionGuard
          requiredPermissions={[HelpdeskPermissions.TicketWrite]}
          fallback={<StatusBadge color={priorityConfig.color}>{priorityConfig.label}</StatusBadge>}
        >
          <BaseSelect
            selectedKeys={new Set([ticket.priority?.toString() ?? ''])}
            onSelectionChange={(keys) => {
              const value = Array.from(keys)[0] as string;
              onUpdate?.({ priority: value as any });
            }}
            isDisabled={isUpdating}
          >
            <BaseSelectItem key={TicketPriority.Critical}>Critical</BaseSelectItem>
            <BaseSelectItem key={TicketPriority.High}>High</BaseSelectItem>
            <BaseSelectItem key={TicketPriority.Normal}>Normal</BaseSelectItem>
            <BaseSelectItem key={TicketPriority.Low}>Low</BaseSelectItem>
            <BaseSelectItem key={TicketPriority.None}>None</BaseSelectItem>
          </BaseSelect>
        </PermissionGuard>
      </div>

      {/* Assignee */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Assignee</label>
        <PermissionGuard
          requiredPermissions={[HelpdeskPermissions.TicketAssign]}
          fallback={<p className="text-sm">{ticket.assigneeName ?? 'Unassigned'}</p>}
        >
          <BaseAutocomplete
            placeholder="Search assignee..."
            isClearable
            selectedKey={ticket.assigneeId ?? null}
            onSelectionChange={(key) => {
              const newKey = key as string | null;
              onUpdate?.({ assigneeId: newKey ?? undefined });
            }}
            onClear={() => onUpdate?.({ assigneeId: undefined })}
            onValueChange={(value: string) => {
              searchUsers({ query: value });
            }}
            onOpenChange={(open) => {
              if (open && !isSearchingUsers) {
                searchUsers({ query: '' });
              }
            }}
            isLoading={isSearchingUsers}
            isDisabled={isUpdating}
            renderSelectedItem={(selectedKey) => {
              const user = usersOptions.find((u) => u.id === selectedKey);
              if (!user) return null;
              return (
                <div className="flex w-full min-w-0 flex-1 items-center gap-2">
                  <BaseAvatar
                    src={user.avatarUrl}
                    name={user.name}
                    size="xs"
                  />
                  <span className="truncate text-xs font-medium">
                    {user.name}
                  </span>
                </div>
              );
            }}
          >
            {usersOptions.map((user) => (
              <BaseAutocompleteItem
                key={user.id}
                textValue={user.name}
              >
                <div className="flex items-center gap-2.5">
                  <BaseAvatar
                    src={user.avatarUrl}
                    name={user.name}
                    size="xs"
                  />
                  <div className="flex-1">
                    <span className="text-xs text-[#59636E] dark:text-white">
                      {user.name}
                    </span>
                    {user.email && (
                      <span className="dark:text-light block text-[10px] text-[#8C8F97]">
                        {user.email}
                      </span>
                    )}
                  </div>
                </div>
              </BaseAutocompleteItem>
            ))}
          </BaseAutocomplete>
        </PermissionGuard>
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
        <PermissionGuard
          requiredPermissions={[HelpdeskPermissions.TicketWrite]}
          fallback={<p className="text-sm">{ticket.categoryName ?? '—'}</p>}
        >
          <BaseAutocomplete
            placeholder="Search category..."
            isClearable
            selectedKey={ticket.categoryId ?? null}
            onSelectionChange={(key) => {
              const newKey = key as string | null;
              onUpdate?.({ categoryId: newKey ?? undefined });
            }}
            onClear={() => onUpdate?.({ categoryId: undefined })}
            onValueChange={(value: string) => {
              searchCategories({ query: value });
            }}
            onOpenChange={(open) => {
              if (open && !isSearchingCategories) {
                searchCategories({ query: '' });
              }
            }}
            isLoading={isSearchingCategories}
            isDisabled={isUpdating}
            renderSelectedItem={(selectedKey) => {
              const category = categoriesOptions.find((c) => c.id === selectedKey);
              if (!category) return null;
              return (
                <span className="truncate text-xs font-medium">
                  {category.sectionName ? `${category.sectionName} / ${category.name}` : category.name}
                </span>
              );
            }}
          >
            {categoriesOptions.map((category) => (
              <BaseAutocompleteItem
                key={category.id}
                textValue={category.sectionName ? `${category.sectionName} / ${category.name}` : category.name}
              >
                <div className="flex flex-col">
                  <span className="text-xs text-[#59636E] dark:text-white">
                    {category.name}
                  </span>
                  {category.sectionName && (
                    <span className="text-[10px] text-[#8C8F97] dark:text-gray-400">
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Requester</label>
          <p className="text-sm">{ticket.requesterName ?? '—'}</p>
        </div>

        {/* Due Date */}
        {ticket.dueDate && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <p className="text-sm">{formatDate(ticket.dueDate)}</p>
          </div>
        )}

        {/* Created */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
          <p className="text-sm">{ticket.createdAt ? formatDate(ticket.createdAt) : '-'}</p>
        </div>

        {/* Updated */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Updated</label>
          <p className="text-sm">{ticket.modifiedAt ? formatDate(ticket.modifiedAt) : '-'}</p>
        </div>

        {/* Tags */}
        <div>
          <PermissionGuard
            requiredPermissions={[HelpdeskPermissions.TicketWrite]}
            fallback={
              ticket.tags && ticket.tags.length > 0 ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {ticket.tags.map((tag) => (
                      <StatusBadge key={tag}>
                        {tag}
                      </StatusBadge>
                    ))}
                  </div>
                </div>
              ) : null
            }
          >
            <BaseSelect
              label="Tags"
              placeholder="Select tags..."
              selectionMode="multiple"
              selectedKeys={new Set(ticketTags?.map(t => t.id) ?? [])}
              onSelectionChange={(keys) => handleTagsChange(Array.from(keys) as string[])}
              isDisabled={isUpdating}
            >
              {availableTags.map((tag) => (
                <BaseSelectItem key={tag.id}>{tag.name}</BaseSelectItem>
              ))}
            </BaseSelect>
          </PermissionGuard>
        </div>
      </div>

      {/* Custom Fields - Placeholder */}
      {ticket.customFields && ticket.customFields.length > 0 && (
        <div className="border-t pt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Custom Fields</label>
          <div className="space-y-2">
            {ticket.customFields.map((field) => (
              <div key={field.fieldId}>
                <label className="block text-xs text-gray-500">{field.fieldName}</label>
                <p className="text-sm">{field.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
