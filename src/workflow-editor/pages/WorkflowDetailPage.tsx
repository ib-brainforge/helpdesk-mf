import { BaseButton } from '@brainforgeau/components';
import { Card, Chip, Spinner } from '@heroui/react';
import { useNavigate, useParams } from '@modern-js/runtime/router';
import { useState } from 'react';
import { BulkCloneModal } from '../components/BulkCloneModal';
import { ScopeBadge } from '../components/ScopeBadge';
import { VersionBadge } from '../components/VersionBadge';
import { VersionDiffViewer } from '../components/VersionDiffViewer';
import {
  useCreateDraft,
  useWorkflowDefinition,
} from '../state/workflowQueries';
import { isTenantOwned } from '../types/workflow';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function WorkflowDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useWorkflowDefinition(id ?? null);
  const createDraftMutation = useCreateDraft();
  const [cloneOpen, setCloneOpen] = useState(false);

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

  const tenantOwned = isTenantOwned(data);
  const hasDraft = data.draftVersion !== null;
  const showDiff = !!(data.latestVersion && data.draftVersion);

  async function handleCreateDraft() {
    if (!id) return;
    await createDraftMutation.mutateAsync(id);
    navigate(`/configuration/workflows/${id}/editor`);
  }

  function handleEditDraft() {
    navigate(`/configuration/workflows/${id}/editor`);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-default-200 px-6 py-4">
        <div>
          <button
            type="button"
            className="mb-2 flex items-center gap-1 text-sm text-default-500 hover:text-default-700"
            onClick={() => navigate('/configuration/workflows')}
          >
            ← Back to Workflows
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold dark:text-white">
              {data.name}
            </h1>
            <ScopeBadge ownerScope={data.ownerScope} />
          </div>
          {data.description && (
            <p className="mt-1 text-sm text-default-500">{data.description}</p>
          )}
        </div>

        {/* Scope-aware action buttons */}
        <div className="flex items-center gap-3">
          {tenantOwned ? (
            <>
              <BaseButton variant="bordered" onPress={() => setCloneOpen(true)}>
                Clone
              </BaseButton>
              {hasDraft ? (
                <BaseButton color="primary" onPress={handleEditDraft}>
                  Edit Draft (v{data.draftVersion!.versionNumber})
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
            </>
          ) : (
            // System or principal-other: only allow cloning to tenant
            <BaseButton color="primary" onPress={() => setCloneOpen(true)}>
              Clone to Tenant
            </BaseButton>
          )}
        </div>
      </div>

      {/* Main layout: content + sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Main content area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Current versions overview */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {data.latestVersion && (
              <div className="rounded border border-default-200 bg-default-50 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-sm font-semibold text-default-700">
                    Published Version
                  </span>
                  <VersionBadge status={data.latestVersion.status} />
                </div>
                <div className="text-sm text-default-600 space-y-1">
                  <div>Version {data.latestVersion.versionNumber}</div>
                  <div>
                    {data.latestVersion.states.length} states ·{' '}
                    {data.latestVersion.transitions.length} transitions
                  </div>
                  {data.latestVersion.publishedAt && (
                    <div className="text-xs text-default-400">
                      Published {formatDate(data.latestVersion.publishedAt)}
                      {data.latestVersion.publishedBy &&
                        ` by ${data.latestVersion.publishedBy}`}
                    </div>
                  )}
                </div>
              </div>
            )}

            {data.draftVersion && (
              <div className="rounded border border-warning-200 bg-warning-50 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-sm font-semibold text-default-700">
                    Draft in Progress
                  </span>
                  <VersionBadge status={data.draftVersion.status} />
                </div>
                <div className="text-sm text-default-600 space-y-1">
                  <div>Version {data.draftVersion.versionNumber}</div>
                  <div>
                    {data.draftVersion.states.length} states ·{' '}
                    {data.draftVersion.transitions.length} transitions
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Version diff — shown only when both published and draft exist */}
          {showDiff && (
            <VersionDiffViewer
              published={data.latestVersion}
              draft={data.draftVersion}
            />
          )}

          {/* States overview */}
          {data.latestVersion && data.latestVersion.states.length > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-semibold dark:text-white">
                States
              </h2>
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

        {/* Right sidebar: version history */}
        {data.versions.length > 0 && (
          <div className="w-72 flex-shrink-0 overflow-y-auto border-l border-default-200 px-4 py-4">
            <Card shadow="none" className="border border-default-200">
              <div className="px-4 pt-4 pb-2">
                <h2 className="text-sm font-semibold text-default-700">
                  Versions
                </h2>
              </div>
              <ul className="divide-y divide-default-100 px-2 pb-2">
                {[...data.versions].reverse().map(v => (
                  <li key={v.id} className="flex items-center gap-3 py-2.5">
                    <div className="flex-1">
                      <span className="text-sm font-medium">
                        v{v.versionNumber}
                      </span>
                      {v.publishedAt && (
                        <span className="ml-2 text-xs text-default-400">
                          {formatDate(v.publishedAt)}
                        </span>
                      )}
                    </div>
                    <VersionBadge status={v.status} />
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        )}
      </div>

      {/* Clone modal */}
      {id && (
        <BulkCloneModal
          isOpen={cloneOpen}
          onOpenChange={setCloneOpen}
          sourceDefinitionId={id}
          sourceDefinitionName={data.name}
          getDetailUrl={newId => `/configuration/workflows/${newId}`}
        />
      )}
    </div>
  );
}
