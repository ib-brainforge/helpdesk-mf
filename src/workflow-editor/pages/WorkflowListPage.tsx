import { BaseButton, BaseInput } from '@brainforgeau/components';
import { Spinner } from '@heroui/react';
import { useNavigate } from '@modern-js/runtime/router';
import { useState } from 'react';
import { VersionBadge } from '../components/VersionBadge';
import { useCreateDefinition, useWorkflowList } from '../state/workflowQueries';
import { VersionStatus } from '../types/enums';

export function WorkflowListPage() {
  const { data, isLoading, error } = useWorkflowList();
  const createMutation = useCreateDefinition();
  const navigate = useNavigate();
  const [newName, setNewName] = useState('');
  const [showCreate, setShowCreate] = useState(false);

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
          <button
            key={d.id}
            type="button"
            className="text-left p-4 border border-gray-200 rounded-lg hover:shadow-md hover:border-gray-300 transition-all cursor-pointer bg-white"
            onClick={() => navigate(`/configuration/workflows/${d.id}`)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
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
        ))}
      </div>
    </div>
  );
}
