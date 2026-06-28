import { BaseButton, BaseCard } from '@brainforgeau/components';
import { useLogger } from '@brainforgeau/observability';
import { ComponentsPalette, autoLayout } from '@brainforgeau/workflow-ui';
import { Card, Chip, Spinner, toast } from '@heroui/react';
import { NavLink, useParams } from '@modern-js/runtime/router';
import { useEffect, useMemo, useState } from 'react';
import { BulkCloneModal } from '../components/BulkCloneModal';
import { ScopeBadge } from '../components/ScopeBadge';
import { VersionBadge } from '../components/VersionBadge';
import { VersionDiffViewer } from '../components/VersionDiffViewer';
import { WorkflowActionButtons } from '../components/WorkflowActionButtons';
import { WorkflowEditor } from '../components/WorkflowEditor';
import {
  HELPDESK_CATEGORY_COLORS,
  HELPDESK_STEP_TYPE_CATALOG,
} from '../components/helpdeskWorkflowCatalog';
import {
  useCreateDraft,
  usePublishDraft,
  useUpdateDraft,
  useWorkflowDefinition,
} from '../state/workflowQueries';
import type { WorkflowStateDto, WorkflowTransitionDto } from '../types';
import { StateType } from '../types/enums';
import { isTenantOwned } from '../types/workflow';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// REVIEW: Using controlled component pattern; draft-first canvas display logic.
export function WorkflowDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useWorkflowDefinition(id ?? null);
  const createDraftMutation = useCreateDraft();
  const updateMut = useUpdateDraft();
  const publishMut = usePublishDraft();
  const [cloneOpen, setCloneOpen] = useState(false);
  const [showVersionsSidebar, setShowVersionsSidebar] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const logger = useLogger('WorkflowDetailPage');

  // Canvas state lifted up so Save/Validate/Publish share the top bar.
  const hasDraft = !!data?.draftVersion;
  const activeVersion = data ? (data.draftVersion ?? data.latestVersion) : null;
  const [states, setStates] = useState<WorkflowStateDto[]>([]);
  const [transitions, setTransitions] = useState<WorkflowTransitionDto[]>([]);
  const [dirty, setDirty] = useState(false);
  const [loadedVersionId, setLoadedVersionId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeVersion) {
      setStates([]);
      setTransitions([]);
      setDirty(false);
      setLoadedVersionId(null);
      return;
    }
    if (loadedVersionId !== activeVersion.id) {
      setStates(autoLayout(activeVersion.states));
      setTransitions(activeVersion.transitions);
      setDirty(false);
      setLoadedVersionId(activeVersion.id);
    }
  }, [activeVersion, loadedVersionId]);

  const tenantOwned = data ? isTenantOwned(data) : false;
  const isReadOnly = !hasDraft;

  async function handleCreateDraft() {
    if (!id) return;
    try {
      await createDraftMutation.mutateAsync(id);
      toast('Draft created', { variant: 'success' });
    } catch (err) {
      logger.captureError(err instanceof Error ? err : new Error(String(err)), {
        context: 'workflow_detail_create_draft_failed',
      });
      toast('Failed to create draft', {
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'danger',
      });
    }
  }

  async function handleSaveDraft() {
    if (!data?.draftVersion) return;
    try {
      const startStateId =
        data.draftVersion.startStateId ??
        states.find(s => s.type === StateType.Initial)?.id ??
        null;
      await updateMut.mutateAsync({
        definitionId: data.id,
        versionId: data.draftVersion.id,
        states,
        transitions,
        startStateId,
      });
      setDirty(false);
      toast('Draft saved', { variant: 'success' });
    } catch (err) {
      if (err instanceof Error) {
        logger.captureError(err, { context: 'workflow_detail_save_failed' });
      } else {
        logger.error('workflow_detail_save_failed');
      }
      const axiosData = (err as { response?: { data?: Record<string, unknown> } })
        .response?.data;
      const detail =
        (axiosData?.detail as string) ??
        (axiosData?.title as string) ??
        (err instanceof Error ? err.message : 'Unknown error');
      toast('Save failed', {
        description: detail,
        variant: 'danger',
      });
      throw err;
    }
  }

  async function handlePublish() {
    if (!data?.draftVersion) return;
    try {
      await publishMut.mutateAsync({
        definitionId: data.id,
        versionId: data.draftVersion.id,
      });
      toast('Workflow published', { variant: 'success' });
    } catch (err) {
      if (err instanceof Error) {
        logger.captureError(err, { context: 'workflow_detail_publish_failed' });
      } else {
        logger.error('workflow_detail_publish_failed');
      }
      toast('Publish failed', {
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'danger',
      });
      throw err;
    }
  }

  function handleCanvasChange(
    nextStates: WorkflowStateDto[],
    nextTransitions: WorkflowTransitionDto[]
  ) {
    setStates(nextStates);
    setTransitions(nextTransitions);
    setDirty(true);
  }

  function handleAddFromPalette(
    newStateData: Omit<WorkflowStateDto, 'id'> & {
      positionX: number;
      positionY: number;
    }
  ) {
    const fullState: WorkflowStateDto = {
      ...newStateData,
      id: crypto.randomUUID(),
    };
    setStates((prev) => [...prev, fullState]);
    setDirty(true);
  }

  const reversedVersions = useMemo(
    () => (data ? [...data.versions].reverse() : []),
    [data]
  );

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="border-danger-200 bg-danger-50 text-danger rounded border p-4">
        Failed to load workflow. Please try again.
      </div>
    );
  }

  // REVIEW: flex-1 min-h-0 fills the app-shell flex parent instead of hardcoding
  // calc(100vh-4rem) which assumed a fixed 4rem navbar and caused the editor to
  // overlap the TopNavbar.
  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
      {/* Single top bar: breadcrumb + badges on the left, all actions on the right */}
      <div className="border-light flex shrink-0 flex-wrap items-center justify-between gap-2 border-b bg-content1 px-4 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <nav className="text-default-500 flex items-center gap-1.5 text-xs">
            <NavLink
              to="/configuration/workflows"
              className="text-default-500 hover:text-default-700 no-underline"
            >
              Workflows
            </NavLink>
            <span>/</span>
            <span className="text-default-900 font-semibold dark:text-white">
              {data.name}
            </span>
          </nav>
          <ScopeBadge ownerScope={data.ownerScope} />
          {activeVersion && (
            <>
              <span className="text-default-600 text-xs font-medium">
                v{activeVersion.versionNumber}
              </span>
              <VersionBadge status={activeVersion.status} />
            </>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {tenantOwned ? (
            <>
              <BaseButton
                size="sm"
                variant="bordered"
                onPress={() => setCloneOpen(true)}
              >
                Clone
              </BaseButton>
              {!hasDraft && (
                <BaseButton
                  size="sm"
                  color="primary"
                  onPress={handleCreateDraft}
                  isDisabled={createDraftMutation.isPending}
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
              onPress={() => setShowPalette((p) => !p)}
            >
              Components
            </BaseButton>
          )}
          <BaseButton
            size="sm"
            variant="bordered"
            onPress={() => setShowVersionsSidebar((prev) => !prev)}
          >
            Versions
          </BaseButton>
          {!isReadOnly && data.draftVersion && (
            <WorkflowActionButtons
              definitionId={data.id}
              versionId={data.draftVersion.id}
              dirty={dirty}
              onSaveDraft={handleSaveDraft}
              onPublish={handlePublish}
            />
          )}
        </div>
      </div>

      {/* No-version empty state */}
      {!activeVersion && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-default-500 text-sm">
            No versions yet. Create a draft to start building this workflow.
          </p>
          {tenantOwned && (
            <BaseButton
              color="primary"
              onPress={handleCreateDraft}
              isDisabled={createDraftMutation.isPending}
            >
              Create first version
            </BaseButton>
          )}
          {!tenantOwned && (
            <BaseButton color="primary" onPress={() => setCloneOpen(true)}>
              Clone to Tenant
            </BaseButton>
          )}
          {id && (
            <BulkCloneModal
              isOpen={cloneOpen}
              onOpenChange={setCloneOpen}
              sourceDefinitionId={id}
              sourceDefinitionName={data.name}
              getDetailUrl={(newId) => `/configuration/workflows/${newId}`}
            />
          )}
        </div>
      )}

      {/* Canvas + right sidebars */}
      {activeVersion && (
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="min-w-0 flex-1 overflow-hidden">
            <WorkflowEditor
              key={activeVersion.id}
              states={states}
              transitions={transitions}
              onChange={handleCanvasChange}
              onAddFromPalette={handleAddFromPalette}
              readOnly={isReadOnly}
            />
          </div>

          {showPalette && !isReadOnly && (
            <ComponentsPalette
              stepTypeCatalog={HELPDESK_STEP_TYPE_CATALOG}
              categoryColors={HELPDESK_CATEGORY_COLORS}
            />
          )}

          {showVersionsSidebar && (
            <aside
              className="border-light flex w-80 shrink-0 flex-col overflow-hidden border-l bg-content1"
              aria-label="Version history"
            >
              <div className="border-light flex items-center justify-between border-b px-4 py-3">
                <span className="text-default-700 text-sm font-semibold">
                  Version History
                </span>
                <button
                  type="button"
                  className="text-default-400 hover:text-default-600 text-sm"
                  onClick={() => setShowVersionsSidebar(false)}
                  aria-label="Close version history"
                >
                  &times;
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-4">
                {data.latestVersion && data.draftVersion && (
                  <VersionDiffViewer
                    published={data.latestVersion}
                    draft={data.draftVersion}
                  />
                )}

                {activeVersion.states.length > 0 && (
                  <div>
                    <h3 className="text-default-500 mb-2 text-xs font-semibold uppercase tracking-wide">
                      States
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {activeVersion.states.map((s) => (
                        <Chip key={s.id} size="sm">
                          {s.name}
                        </Chip>
                      ))}
                    </div>
                  </div>
                )}

                {data.versions.length > 0 && (
                  <BaseCard className="border-light border">
                    <div className="px-4 pb-2 pt-4">
                      <h3 className="text-default-700 text-sm font-semibold">
                        All Versions
                      </h3>
                    </div>
                    <ul className="divide-default-100 divide-y px-2 pb-2">
                      {reversedVersions.map((v) => (
                        <li
                          key={v.id}
                          className="flex items-center gap-3 py-2.5"
                        >
                          <div className="flex-1">
                            <span className="text-sm font-medium">
                              v{v.versionNumber}
                            </span>
                            {v.publishedAt && (
                              <span className="text-default-400 ml-2 text-xs">
                                {formatDate(v.publishedAt)}
                              </span>
                            )}
                          </div>
                          <VersionBadge status={v.status} />
                        </li>
                      ))}
                    </ul>
                  </BaseCard>
                )}

                {data.versions.length === 0 && (
                  <p className="text-default-400 text-xs italic">
                    No published versions yet.
                  </p>
                )}
              </div>
            </aside>
          )}
        </div>
      )}

      {activeVersion && id && (
        <BulkCloneModal
          isOpen={cloneOpen}
          onOpenChange={setCloneOpen}
          sourceDefinitionId={id}
          sourceDefinitionName={data.name}
          getDetailUrl={(newId) => `/configuration/workflows/${newId}`}
        />
      )}
    </div>
  );
}
