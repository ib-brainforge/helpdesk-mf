import { type FC, useCallback, useState } from 'react';
import { BaseSelect, BaseSelectItem } from '@brainforgeau/components';
import { PermissionGuard } from '@brainforgeau/security';
import { StatusBadge } from '@/components/shared';
import { TicketStatus, TicketPriority, type TicketDto } from '@/types/ticket';
import { TagInput } from '@/components/tags/TagInput';
import { useTags, useTicketTags, useAddTagToTicket, useRemoveTagFromTicket, useCreateTag } from '@/components/tags/hooks/useTags';
import { HelpdeskPermissions } from '@/constants/permissions';

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
  const { tags: availableTags, refetch: refetchAvailableTags } = useTags();
  const { tags: ticketTags, refetch: refetchTicketTags } = useTicketTags(ticket.id ?? '');
  const addTagMutation = useAddTagToTicket();
  const removeTagMutation = useRemoveTagFromTicket();
  const createTagMutation = useCreateTag();

  const [selectedTagNames, setSelectedTagNames] = useState<string[]>(
    ticketTags?.map(t => t.name) ?? []
  );

  const handleTagsChange = useCallback(
    async (newTagNames: string[]) => {
      setSelectedTagNames(newTagNames);

      const currentTagNames = ticketTags?.map(t => t.name) ?? [];
      const added = newTagNames.filter(name => !currentTagNames.includes(name));
      const removed = ticketTags?.filter(tag => !newTagNames.includes(tag.name)) ?? [];

      // REVIEW: Add new tags - create tag first if doesn't exist, then add to ticket
      for (const tagName of added) {
        let tagId = availableTags.find(t => t.name === tagName)?.id;

        // Create tag if it doesn't exist
        if (!tagId) {
          const newTagId = await createTagMutation.mutateAsync({ name: tagName });
          tagId = newTagId as string;
          await refetchAvailableTags();
        }

        // Add tag to ticket
        if (tagId) {
          await addTagMutation.mutateAsync({ ticketId: ticket.id ?? '', tagId });
        }
      }

      // Remove tags
      for (const tag of removed) {
        await removeTagMutation.mutateAsync({ ticketId: ticket.id ?? '', tagId: tag.id });
      }

      await refetchTicketTags();
    },
    [ticket.id, ticketTags, availableTags, addTagMutation, removeTagMutation, createTagMutation, refetchTicketTags, refetchAvailableTags]
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
          <BaseSelect
            placeholder="Unassigned"
            selectedKeys={ticket.assigneeId ? new Set([ticket.assigneeId]) : new Set()}
            onSelectionChange={(keys) => {
              const value = Array.from(keys)[0] as string | undefined;
              onUpdate?.({ assigneeId: value });
            }}
            isDisabled={isUpdating}
          >
            {/* TODO: Load users from API */}
            <BaseSelectItem key="user-1">John Doe</BaseSelectItem>
            <BaseSelectItem key="user-2">Jane Smith</BaseSelectItem>
          </BaseSelect>
        </PermissionGuard>
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
        <PermissionGuard
          requiredPermissions={[HelpdeskPermissions.TicketWrite]}
          fallback={<p className="text-sm">{ticket.categoryName ?? '—'}</p>}
        >
          <BaseSelect
            placeholder="Select category"
            selectedKeys={ticket.categoryId ? new Set([ticket.categoryId]) : new Set()}
            onSelectionChange={(keys) => {
              const value = Array.from(keys)[0] as string | undefined;
              onUpdate?.({ categoryId: value });
            }}
            isDisabled={isUpdating}
          >
            {/* TODO: Load categories from API */}
            <BaseSelectItem key="cat-1">Authentication</BaseSelectItem>
            <BaseSelectItem key="cat-2">Access</BaseSelectItem>
            <BaseSelectItem key="cat-3">Feature Request</BaseSelectItem>
          </BaseSelect>
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
            <TagInput
              selectedTags={selectedTagNames}
              availableTags={availableTags}
              onTagsChange={handleTagsChange}
            />
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
