import { BaseButton, BaseInput } from '@brainforgeau/components';
import { Spinner, addToast } from '@heroui/react';
import { useNavigate } from '@modern-js/runtime/router';
import { useState } from 'react';
import { ConfirmActionModal } from '../components/ConfirmActionModal';
import { VersionBadge } from '../components/VersionBadge';
import {
  useCreateDefinition,
  useDeleteDefinition,
  useWorkflowList,
} from '../state/workflowQueries';
import { VersionStatus } from '../types/enums';

export function WorkflowListPage() {
  const { data, isLoading, error } = useWorkflowList();
  const createMutation = useCreateDefinition();
  const deleteMutation = useDeleteDefinition();
  const navigate = useNavigate();
  const [newName, setNewName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner label="Loading workflows..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded border border-danger-200 bg-danger-50 p-4 text-danger">
        Failed to load workflows. Please try again.
      </div>
    );
  }

  async function handleCreate() {
    const name = newName.trim() || 'Untitled workflow';
    const result = await createMutation.mutateAsync({ name });
    setNewName('');
    setShowCreate(false);
    navigate(`/configuration/workflows/${result.id}`);
  }

  async function handleDeleteConfirm() {
    if (!pendingDeleteId) return;
    try {
      await deleteMutation.mutateAsync(pendingDeleteId);
      addToast({ title: 'Workflow deleted', severity: 'success' });
    } catch (err) {
      addToast({
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        severity: 'danger',
      });
    } finally {
      setPendingDeleteId(null);
    }
  }

  const pendingDelete = data?.find(d => d.id === pendingDeleteId);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Workflows</h1>
        <BaseButton
          color="primary"
          onPress={() => setShowCreate(prev => !prev)}
        >
          {showCreate ? 'Cancel' : 'New Workflow'}
        </BaseButton>
      </div>

      {showCreate && (
        <div className="flex gap-2 items-end p-4 border border-gray-200 rounded-lg bg-gray-50">
          <BaseInput
            label="Workflow Name"
            value={newName}
            onValueChange={setNewName}
            placeholder="e.g. Standard Helpdesk"
            labelPlacement="outside"
            size="sm"
            className="flex-1"
          />
          <BaseButton
            color="primary"
            onPress={handleCreate}
            isLoading={createMutation.isPending}
          >
            Create
          </BaseButton>
        </div>
      )}

      {data?.length === 0 && (
        <div className="flex h-40 items-center justify-center text-gray-500">
          No workflow definitions yet. Create your first one above.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data?.map(d => (
          <div
            key={d.id}
            className="relative text-left p-4 border border-gray-200 rounded-lg hover:shadow-md hover:border-gray-300 transition-all bg-white"
          >
            <button
              type="button"
              className="w-full text-left"
              onClick={() => navigate(`/configuration/workflows/${d.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 pr-8">
                  <div className="font-semibold text-gray-900 truncate">
                    {d.name}
                  </div>
                  <div className="text-sm text-gray-500 mt-0.5 truncate">
                    {d.description ?? 'No description'}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {d.versions.length} version
                    {d.versions.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <div className="ml-3 flex-shrink-0">
                  {d.draftVersion ? (
                    <VersionBadge status={d.draftVersion.status} />
                  ) : d.latestVersion ? (
                    <VersionBadge status={d.latestVersion.status} />
                  ) : (
                    <VersionBadge status={VersionStatus.Draft} />
                  )}
                </div>
              </div>
            </button>
            {/* Delete icon button */}
            <button
              type="button"
              aria-label={`Delete ${d.name}`}
              className="absolute top-3 right-3 p-1 text-gray-400 hover:text-danger rounded transition-colors"
              onClick={e => {
                e.stopPropagation();
                setPendingDeleteId(d.id);
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Delete confirm modal */}
      <ConfirmActionModal
        isOpen={pendingDeleteId !== null}
        onOpenChange={open => !open && setPendingDeleteId(null)}
        title="Delete workflow?"
        description={
          <>
            Are you sure you want to delete{' '}
            <strong>{pendingDelete?.name ?? 'this workflow'}</strong>? This
            action cannot be undone.
          </>
        }
        confirmLabel="Delete"
        destructive
        isLoading={deleteMutation.isPending}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
