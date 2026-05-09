import { Breadcrumbs } from '@/components/Breadcrumbs';
import { CustomStatusEditorModal } from '@/components/custom-statuses/components/CustomStatusEditorModal';
import {
  useCustomStatuses,
  useDeleteCustomStatus,
} from '@/components/custom-statuses/hooks/useCustomStatuses';
import { ConfirmDeleteModal } from '@/components/principal/ConfirmDeleteModal';
import type { CustomTicketStatusDto } from '@/types/custom-status';
import { TicketStatus } from '@/types/custom-status';
import { Icon } from '@brainforgeau/components/base';
import { BaseButton } from '@brainforgeau/components/button';
import { Chip, Spinner, toast } from '@heroui/react';
import { Helmet } from '@modern-js/runtime/head';
import { useState } from 'react';

const MAPS_TO_LABELS: Record<TicketStatus, string> = {
  [TicketStatus.New]: 'New',
  [TicketStatus.InProgress]: 'In Progress',
  [TicketStatus.Closed]: 'Closed',
};

function CustomStatusesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<
    CustomTicketStatusDto | undefined
  >();
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const { customStatuses, isLoading } = useCustomStatuses();
  const deleteMutation = useDeleteCustomStatus();

  const handleCreate = () => {
    setEditingStatus(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (status: CustomTicketStatusDto) => {
    setEditingStatus(status);
    setIsModalOpen(true);
  };

  const handleDeleteRequest = (id: string, name: string) => {
    setPendingDelete({ id, name });
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDelete) return;
    try {
      await deleteMutation.mutateAsync(pendingDelete.id);
      toast('Deleted', { description: 'Custom status deleted', variant: 'success' });
    } catch {
      toast('Error', { description: 'Failed to delete custom status', variant: 'danger' });
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <>
      <Helmet>
        <title>Custom Statuses - Helpdesk</title>
      </Helmet>

      <div className="mb-6">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Configuration', href: '/configuration' },
            {
              label: 'Custom Statuses',
              href: '/configuration/custom-statuses',
              isCurrent: true,
            },
          ]}
        />
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Custom Statuses</h1>
          <p className="text-default-500 mt-1">
            Define custom ticket statuses to match your team's workflow
          </p>
        </div>
        <BaseButton
          color="primary"
          onPress={handleCreate}
          icon={<Icon name="plus" className="h-4 w-4" />}
        >
          Add Status
        </BaseButton>
      </div>

      <div className="max-w-3xl">
        <div className="mb-4 p-4 bg-default-50 rounded-lg border border-default-200">
          <p className="text-sm text-default-700">
            Custom statuses appear in the ticket status selector alongside the
            built-in statuses (New, In Progress, Closed). Each custom status
            maps to a built-in lifecycle state for SLA and reporting
            calculations.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : customStatuses.length === 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <div className="p-12 text-center">
              <Icon
                name="flag"
                className="h-12 w-12 text-default-300 mx-auto mb-3"
              />
              <p className="text-default-500 mb-1 font-medium">
                No custom statuses yet
              </p>
              <p className="text-default-400 text-sm mb-4">
                Add your first custom status to extend the built-in ticket
                lifecycle
              </p>
              <BaseButton color="primary" size="sm" onPress={handleCreate}>
                Create First Status
              </BaseButton>
            </div>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-default-100 px-4 py-3 border-b flex items-center justify-between">
              <h3 className="font-semibold text-sm">
                Custom Statuses ({customStatuses.length})
              </h3>
            </div>
            <div className="divide-y">
              {customStatuses.map(status => (
                <div
                  key={status.id}
                  className="px-4 py-3 flex items-center gap-3"
                >
                  {/* Color swatch */}
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0 border border-default-200"
                    style={{ backgroundColor: status.color ?? '#6366f1' }}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{status.name}</span>

                      {status.isDefault && (
                        <Chip size="sm" color="accent">
                          Default
                        </Chip>
                      )}
                      {status.isClosed && (
                        <Chip size="sm" color="success">
                          Counts as Closed
                        </Chip>
                      )}
                      {!status.isActive && (
                        <Chip size="sm" color="default">
                          Inactive
                        </Chip>
                      )}
                    </div>
                    <p className="text-xs text-default-400 mt-0.5">
                      Maps to:{' '}
                      {MAPS_TO_LABELS[status.mapsToStatus] ?? 'Unknown'} · Sort:{' '}
                      {status.sortOrder}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <BaseButton
                      size="sm"
                      variant="light"
                      isIconOnly
                      onPress={() => handleEdit(status)}
                      aria-label="Edit status"
                    >
                      <Icon name="pencil-square" className="h-4 w-4" />
                    </BaseButton>
                    <BaseButton
                      size="sm"
                      variant="light"
                      color="danger"
                      isIconOnly
                      onPress={() =>
                        handleDeleteRequest(status.id, status.name)
                      }
                      aria-label="Delete status"
                    >
                      <Icon name="trash" className="h-4 w-4" />
                    </BaseButton>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <CustomStatusEditorModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingStatus(undefined);
        }}
        status={editingStatus}
      />

      <ConfirmDeleteModal
        isOpen={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Custom Status"
        message={`Are you sure you want to delete "${pendingDelete?.name}"? This cannot be undone.`}
        isPending={deleteMutation.isPending}
      />
    </>
  );
}

export default CustomStatusesPage;
