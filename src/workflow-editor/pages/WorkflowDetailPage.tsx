import { BaseButton } from '@brainforgeau/components';
import { Chip, Spinner } from '@heroui/react';
import { useNavigate, useParams } from '@modern-js/runtime/router';
import { VersionBadge } from '../components/VersionBadge';
import {
  useCreateDraft,
  useWorkflowDefinition,
} from '../state/workflowQueries';

export function WorkflowDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useWorkflowDefinition(id ?? null);
  const createDraftMutation = useCreateDraft();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner label="Loading workflow..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded border border-danger-200 bg-danger-50 p-4 text-danger">
        Failed to load workflow. Please try again.
      </div>
    );
  }

  async function handleCreateDraft() {
    if (!id) return;
    await createDraftMutation.mutateAsync(id);
    navigate(`/configuration/workflows/${id}/editor`);
  }

  function handleEditDraft() {
    navigate(`/configuration/workflows/${id}/editor`);
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            type="button"
            className="text-sm text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-1"
            onClick={() => navigate('/configuration/workflows')}
          >
            ← Back to Workflows
          </button>
          <h1 className="text-2xl font-bold">{data.name}</h1>
          {data.description && (
            <p className="text-gray-500 mt-1">{data.description}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {data.draftVersion ? (
            <BaseButton color="primary" onPress={handleEditDraft}>
              Edit Draft
            </BaseButton>
          ) : (
            <BaseButton
              color="primary"
              onPress={handleCreateDraft}
              isLoading={createDraftMutation.isPending}
            >
              Create Draft
            </BaseButton>
          )}
        </div>
      </div>

      {/* Current versions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.latestVersion && (
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold text-gray-700">
                Published Version
              </span>
              <VersionBadge status={data.latestVersion.status} />
            </div>
            <div className="text-sm text-gray-600">
              <div>Version {data.latestVersion.versionNumber}</div>
              <div>
                {data.latestVersion.states.length} states ·{' '}
                {data.latestVersion.transitions.length} transitions
              </div>
              {data.latestVersion.publishedAt && (
                <div className="text-xs text-gray-400 mt-1">
                  Published{' '}
                  {new Date(
                    data.latestVersion.publishedAt,
                  ).toLocaleDateString()}
                  {data.latestVersion.publishedBy &&
                    ` by ${data.latestVersion.publishedBy}`}
                </div>
              )}
            </div>
          </div>
        )}

        {data.draftVersion && (
          <div className="border border-amber-200 rounded-lg p-4 bg-amber-50">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold text-gray-700">
                Draft in Progress
              </span>
              <VersionBadge status={data.draftVersion.status} />
            </div>
            <div className="text-sm text-gray-600">
              <div>Version {data.draftVersion.versionNumber}</div>
              <div>
                {data.draftVersion.states.length} states ·{' '}
                {data.draftVersion.transitions.length} transitions
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Version history */}
      {data.versions.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Version History</h2>
          <div className="space-y-2">
            {[...data.versions].reverse().map(v => (
              <div
                key={v.id}
                className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg"
              >
                <div className="flex-1">
                  <span className="text-sm font-medium">
                    Version {v.versionNumber}
                  </span>
                  {v.publishedAt && (
                    <span className="text-xs text-gray-400 ml-2">
                      {new Date(v.publishedAt).toLocaleString()}
                    </span>
                  )}
                </div>
                <VersionBadge status={v.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* States overview */}
      {data.latestVersion && (
        <div>
          <h2 className="text-lg font-semibold mb-3">States</h2>
          <div className="flex flex-wrap gap-2">
            {data.latestVersion.states.map(s => (
              <Chip key={s.id} size="sm" variant="flat">
                {s.name}
              </Chip>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
