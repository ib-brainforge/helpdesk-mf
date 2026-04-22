import { usePrincipalAccess } from '@/hooks/usePrincipalAccess';
import { BaseButton } from '@brainforgeau/components';
import { useLogger } from '@brainforgeau/observability';
import { Card, Chip, Spinner, addToast } from '@heroui/react';
import { NavLink, useParams } from '@modern-js/runtime/router';
import { useState } from 'react';
import { BulkCloneModal } from '../components/BulkCloneModal';
import { ComponentsPalette } from '../components/ComponentsPalette';
import { PrincipalLookup } from '../components/PrincipalLookup';
import { ScopeBadge } from '../components/ScopeBadge';
import { VersionBadge } from '../components/VersionBadge';
import { VersionDiffViewer } from '../components/VersionDiffViewer';
import { WorkflowEditor } from '../components/WorkflowEditor';
import {
  useCreatePrincipalDraft,
  usePrincipalWorkflowDefinition,
  usePublishPrincipalDraft,
  useUpdatePrincipalDraft,
} from '../state/workflowQueries';
import type {
  WorkflowStateDto,
  WorkflowTransitionDto,
} from '../types';
import { isPrincipalOwned, isTenantOwned } from '../types/workflow';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// REVIEW: Using controlled component pattern; draft-first canvas display logic.
export function PrincipalWorkflowDetailPage() {
  const { principalId, id } = useParams<{
    principalId: string;
    id: string;
  }>();
  const { data, isLoading, error } = usePrincipalWorkflowDefinition(
    principalId ?? '',
    id ?? null,
  );
  const createDraftMutation = useCreatePrincipalDraft();
  const updateMut = useUpdatePrincipalDraft();
  const publishMut = usePublishPrincipalDraft();
  const [cloneOpen, setCloneOpen] = useState(false);
  const [showVersionsSidebar, setShowVersionsSidebar] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const logger = useLogger('PrincipalWorkflowDetailPage');

  const { level: principalAccessLevel, isLoading: isAccessLoading } =
    usePrincipalAccess(principalId ?? '');

  if (isLoading || isAccessLoading) {
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

  // User can edit if: workflow is tenant-owned OR it's principal-owned AND user has admin/agent access
  const canEdit =
    isTenantOwned(data) ||
    (isPrincipalOwned(data) &&
      (principalAccessLevel === 'admin' || principalAccessLevel === 'agent'));

  const hasDraft = data.draftVersion !== null;
  // Show draft in canvas if it exists, otherwise show the published version
  const activeVersion = data.draftVersion ?? data.latestVersion;
  const isReadOnly = !hasDraft || !canEdit;

  async function handleCreateDraft() {
    if (!principalId || !id) return;
    try {
      await createDraftMutation.mutateAsync({ principalId, definitionId: id });
      addToast({ title: 'Draft created', severity: 'success' });
    } catch (err) {
      logger.captureError(err instanceof Error ? err : new Error(String(err)), {
        context: 'principal_workflow_detail_create_draft_failed',
      });
      addToast({
        title: 'Failed to create draft',
        description: err instanceof Error ? err.message : 'Unknown error',
        severity: 'danger',
      });
    }
  }

  async function handleSaveDraft(
    states: WorkflowStateDto[],
    transitions: WorkflowTransitionDto[],
    startStateId: string | null,
  ) {
    if (!principalId) return;
    try {
      await updateMut.mutateAsync({
        principalId,
        definitionId: data!.id,
        versionId: data!.draftVersion!.id,
        states,
        transitions,
        startStateId,
      });
      addToast({ title: 'Draft saved', severity: 'success' });
    } catch (err) {
      if (err instanceof Error) {
        logger.captureError(err, {
          context: 'principal_workflow_detail_save_failed',
        });
      } else {
        logger.error('principal_workflow_detail_save_failed');
      }
      addToast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        severity: 'danger',
      });
      throw err;
    }
  }

  async function handlePublish() {
    if (!principalId) return;
    try {
      await publishMut.mutateAsync({
        principalId,
        definitionId: data!.id,
        versionId: data!.draftVersion!.id,
      });
      addToast({ title: 'Workflow published', severity: 'success' });
    } catch (err) {
      if (err instanceof Error) {
        logger.captureError(err, {
          context: 'principal_workflow_detail_publish_failed',
        });
      } else {
        logger.error('principal_workflow_detail_publish_failed');
      }
      addToast({
        title: 'Publish failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        severity: 'danger',
      });
      throw err;
    }
  }

  return (
    // REVIEW: -m-5 override matches tracking-mf rules page pattern for full-height canvas
    <div className="-m-5 flex h-[calc(100vh-4rem)] flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-default-200 bg-white px-4 py-2 dark:bg-default-50">
        {/* Left: breadcrumb + title + badges */}
        <div className="flex min-w-0 items-center gap-3">
          <nav className="flex items-center gap-1.5 text-xs text-default-500">
            <NavLink
              to={`/principal/${principalId}/workflows`}
              className="text-default-500 no-underline hover:text-default-700"
            >
              Workflows
            </NavLink>
            <span>/</span>
            <span className="font-semibold text-default-900 dark:text-white">
              {data.name}
            </span>
          </nav>
          <ScopeBadge ownerScope={data.ownerScope} />
          {activeVersion && (
            <VersionBadge status={activeVersion.status} />
          )}
          {principalId && (
            <span className="text-xs text-default-400">
              <PrincipalLookup principalId={principalId} />
            </span>
          )}
        </div>

        {/* Right: action buttons */}
        <div className="flex shrink-0 items-center gap-2">
          {canEdit ? (
            <>
              <BaseButton
                size="sm"
                variant="bordered"
                onPress={() => setCloneOpen(true)}
              >
                Clone
              </BaseButton>
              {hasDraft ? (
                // Draft is already loaded in the canvas — button is a visual indicator
                <BaseButton
                  size="sm"
                  variant="bordered"
                  color="warning"
                  isDisabled
                >
                  Editing Draft (v{data.draftVersion!.versionNumber})
                </BaseButton>
              ) : (
                <BaseButton
                  size="sm"
                  color="primary"
                  onPress={handleCreateDraft}
                  isLoading={createDraftMutation.isPending}
                >
                  Create Draft
                </BaseButton>
              )}
            </>
          ) : (
            <BaseButton
              size="sm"
              color="primary"
              onPress={() => setCloneOpen(true)}
            >
              Clone to Tenant
            </BaseButton>
          )}
          {!isReadOnly && (
            <BaseButton
              size="sm"
              variant="bordered"
              color={showPalette ? 'primary' : undefined}
              onPress={() => setShowPalette(p => !p)}
            >
              Components
            </BaseButton>
          )}
          <BaseButton
            size="sm"
            variant="bordered"
            onPress={() => setShowVersionsSidebar(prev => !prev)}
          >
            Versions
          </BaseButton>
        </div>
      </div>

      {/* No-version empty state */}
      {!activeVersion && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-sm text-default-500">
            No versions yet. Create a draft to start building this workflow.
          </p>
          {canEdit && (
            <BaseButton
              color="primary"
              onPress={handleCreateDraft}
              isLoading={createDraftMutation.isPending}
            >
              Create first version
            </BaseButton>
          )}
          {!canEdit && (
            <BaseButton color="primary" onPress={() => setCloneOpen(true)}>
              Clone to Tenant
            </BaseButton>
          )}
          {id && principalId && (
            <BulkCloneModal
              isOpen={cloneOpen}
              onOpenChange={setCloneOpen}
              sourceDefinitionId={id}
              sourceDefinitionName={data.name}
              principalId={principalId}
              getDetailUrl={newId =>
                `/principal/${principalId}/workflows/${newId}`
              }
            />
          )}
        </div>
      )}

      {/* Canvas + right sidebar */}
      {activeVersion && (
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Canvas area */}
          <div className="min-w-0 flex-1 overflow-hidden">
            <WorkflowEditor
              key={activeVersion.id}
              definitionId={data.id}
              version={activeVersion}
              readOnly={isReadOnly}
              onSaveDraft={hasDraft && canEdit ? handleSaveDraft : undefined}
              onPublish={hasDraft && canEdit ? handlePublish : undefined}
            />
          </div>

          {/* Components palette sidebar — drag sources for new states */}
          {showPalette && !isReadOnly && <ComponentsPalette />}

          {/* Right sidebar: version history + diff */}
          {showVersionsSidebar && (
            <aside
              className="flex w-80 shrink-0 flex-col overflow-hidden border-l border-default-200 bg-white dark:bg-default-50"
              aria-label="Version history"
            >
              <div className="flex items-center justify-between border-b border-default-200 px-4 py-3">
                <span className="text-sm font-semibold text-default-700">
                  Version History
                </span>
                <button
                  type="button"
                  className="text-sm text-default-400 hover:text-default-600"
                  onClick={() => setShowVersionsSidebar(false)}
                  aria-label="Close version history"
                >
                  &times;
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Diff viewer when both published and draft exist */}
                {data.latestVersion && data.draftVersion && (
                  <VersionDiffViewer
                    published={data.latestVersion}
                    draft={data.draftVersion}
                  />
                )}

                {/* States chip overview */}
                {activeVersion.states.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-default-500">
                      States
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {activeVersion.states.map(s => (
                        <Chip key={s.id} size="sm" variant="flat">
                          {s.name}
                        </Chip>
                      ))}
                    </div>
                  </div>
                )}

                {/* Version list */}
                {data.versions.length > 0 && (
                  <Card shadow="none" className="border border-default-200">
                    <div className="px-4 pt-4 pb-2">
                      <h3 className="text-sm font-semibold text-default-700">
                        All Versions
                      </h3>
                    </div>
                    <ul className="divide-y divide-default-100 px-2 pb-2">
                      {[...data.versions].reverse().map(v => (
                        <li
                          key={v.id}
                          className="flex items-center gap-3 py-2.5"
                        >
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
                )}

                {data.versions.length === 0 && (
                  <p className="text-xs text-default-400 italic">
                    No published versions yet.
                  </p>
                )}
              </div>
            </aside>
          )}
        </div>
      )}

      {/* Clone modal */}
      {activeVersion && id && principalId && (
        <BulkCloneModal
          isOpen={cloneOpen}
          onOpenChange={setCloneOpen}
          sourceDefinitionId={id}
          sourceDefinitionName={data.name}
          principalId={principalId}
          getDetailUrl={newId =>
            `/principal/${principalId}/workflows/${newId}`
          }
        />
      )}
    </div>
  );
}
