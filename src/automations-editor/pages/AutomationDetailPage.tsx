/**
 * Tenant-scoped automation rule-graph detail / editor page.
 *
 * Layout follows the exact same pattern as WorkflowDetailPage:
 * - Single top bar: breadcrumb + version badge on left, actions on right
 * - Full-height canvas: h-[calc(100dvh-var(--bf-shell-top-offset,55px))]
 * - GraphEditor from @brainforgeau/rules-ui with helpdesk catalogs
 * - Versions sidebar on the right
 * - Key the GraphEditor by active version id so canvas remounts on version switch
 *
 * REVIEW: ReactFlowProvider is included inside GraphEditor — no external wrap needed
 * (confirmed from @brainforgeau/rules-ui GraphEditor.tsx which wraps ReactFlowProvider).
 */
import { BaseButton, BaseCard } from '@brainforgeau/components';
import { useLogger } from '@brainforgeau/observability';
import {
  GraphEditor,
  NodePalette,
  type RuleGraphContent,
  type RuleGraphVersionDto,
} from '@brainforgeau/rules-ui';
import { Card, Chip, Spinner, toast } from '@heroui/react';
import { NavLink, useParams } from '@modern-js/runtime/router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { HELPDESK_ACTION_TYPES } from '../catalogs/helpdeskActionTypeCatalog';
import { HELPDESK_INPUT_FIELDS } from '../catalogs/helpdeskInputFieldCatalog';
import { HELPDESK_OUTPUT_FIELDS } from '../catalogs/helpdeskOutputFieldCatalog';
import {
  useCreateRuleGraphVersion,
  usePublishRuleGraphVersion,
  useRuleGraph,
  useRuleGraphs,
} from '../state/ruleProjectQueries';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function versionStatusBadge(isPublished: boolean) {
  return isPublished ? (
    <Chip size="sm" color="success">
      Published
    </Chip>
  ) : (
    <Chip size="sm" color="warning">
      Draft
    </Chip>
  );
}

// REVIEW: Using controlled component pattern; content state lifted up to share between
// top bar Save/Publish actions and the canvas.
export function AutomationDetailPage() {
  const { projectId, ruleId } = useParams<{
    projectId: string;
    ruleId: string;
  }>();

  const {
    data: rule,
    isLoading,
    error,
  } = useRuleGraph(projectId ?? null, ruleId ?? null);
  const createVersionMutation = useCreateRuleGraphVersion();
  const publishMutation = usePublishRuleGraphVersion();
  const logger = useLogger('AutomationDetailPage');

  const [showVersionsSidebar, setShowVersionsSidebar] = useState(false);
  const [showPalette, setShowPalette] = useState(true);
  const [editableContent, setEditableContent] =
    useState<RuleGraphContent | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [loadedVersionId, setLoadedVersionId] = useState<string | null>(null);

  // Determine the active version: latest version (most recently created), falling back to published
  const activeVersion = useMemo(() => {
    if (!rule) return null;
    if (rule.versions.length > 0) {
      return [...rule.versions].sort(
        (a, b) => b.versionNumber - a.versionNumber,
      )[0];
    }
    return rule.publishedVersion ?? null;
  }, [rule]);

  useEffect(() => {
    if (!activeVersion) {
      setEditableContent({ nodes: [], edges: [] });
      setIsDirty(false);
      setLoadedVersionId(null);
      return;
    }
    if (loadedVersionId !== activeVersion.id) {
      const snapshot = activeVersion.contentSnapshot ?? {
        nodes: [],
        edges: [],
      };
      setEditableContent(JSON.parse(JSON.stringify(snapshot)));
      setIsDirty(false);
      setLoadedVersionId(activeVersion.id);
    }
  }, [activeVersion, loadedVersionId]);

  const handleContentChange = useCallback((content: RuleGraphContent) => {
    setEditableContent(content);
    setIsDirty(true);
  }, []);

  async function handleSaveDraft() {
    if (!projectId || !ruleId || !editableContent) return;
    try {
      await createVersionMutation.mutateAsync({
        projectId,
        ruleId,
        content: editableContent,
      });
      setIsDirty(false);
      toast('Draft saved', { variant: 'success' });
    } catch (err) {
      if (err instanceof Error) {
        logger.captureError(err, { context: 'automation_detail_save_failed' });
      } else {
        logger.error('automation_detail_save_failed');
      }
      toast('Save failed', {
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'danger',
      });
      throw err;
    }
  }

  async function handlePublish() {
    if (!projectId || !ruleId || !editableContent) return;

    // Frontend validation: compiler requires input + output nodes
    const nodes = editableContent.nodes ?? [];
    const hasInput = nodes.some(
      (n: { type?: string }) => n.type === 'inputNode',
    );
    const hasOutput = nodes.some(
      (n: { type?: string }) => n.type === 'outputNode',
    );
    if (!hasInput || !hasOutput) {
      toast('Cannot publish', {
        description: !hasInput
          ? 'The graph requires an Input node.'
          : 'The graph requires an Output node.',
        variant: 'danger',
      });
      return;
    }

    try {
      // Always save current content as a new version before publishing
      const version = await createVersionMutation.mutateAsync({
        projectId,
        ruleId,
        content: editableContent,
      });
      await publishMutation.mutateAsync({
        projectId,
        ruleId,
        versionId: version.id,
      });
      setIsDirty(false);
      toast('Automation published', { variant: 'success' });
    } catch (err: unknown) {
      if (err instanceof Error) {
        logger.captureError(err, {
          context: 'automation_detail_publish_failed',
        });
      } else {
        logger.error('automation_detail_publish_failed');
      }
      // Extract error detail from backend response
      const detail =
        (
          err as {
            response?: { data?: { detail?: string; errors?: string[] } };
          }
        )?.response?.data?.detail ??
        (err as { response?: { data?: { errors?: string[] } } })?.response?.data
          ?.errors?.[0] ??
        (err instanceof Error ? err.message : 'Unknown error');
      toast('Publish failed', {
        description: detail,
        variant: 'danger',
      });
    }
  }

  async function handlePublishVersion(version: RuleGraphVersionDto) {
    if (!projectId || !ruleId) return;
    try {
      await publishMutation.mutateAsync({
        projectId,
        ruleId,
        versionId: version.id,
      });
      toast('Version published', { variant: 'success' });
    } catch (err: unknown) {
      if (err instanceof Error) {
        logger.captureError(err, {
          context: 'automation_detail_publish_version_failed',
        });
      }
      const detail =
        (
          err as {
            response?: { data?: { detail?: string; errors?: string[] } };
          }
        )?.response?.data?.detail ??
        (err as { response?: { data?: { errors?: string[] } } })?.response?.data
          ?.errors?.[0] ??
        (err instanceof Error ? err.message : 'Unknown error');
      toast('Publish failed', {
        description: detail,
        variant: 'danger',
      });
    }
  }

  const reversedVersions = useMemo(
    () => (rule ? [...rule.versions].reverse() : []),
    [rule],
  );

  const isSaving = createVersionMutation.isPending;
  const isPublishing = publishMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error || !rule) {
    return (
      <div className="border-danger-200 bg-danger-50 text-danger rounded border p-4">
        Failed to load automation. Please try again.
      </div>
    );
  }

  // Fills the viewport below the shell's top block (navbar + alert strip +
  // subscription banner), published as --bf-shell-top-offset.
  return (
    <div className="flex min-h-0 h-[calc(100dvh-var(--bf-shell-top-offset,55px))] flex-col overflow-hidden bg-white dark:bg-zinc-900 dark:text-zinc-100">
      {/* Top bar: breadcrumb + badges left, actions right */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-zinc-200 bg-white px-4 py-2 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex min-w-0 items-center gap-3">
          <nav className="text-default-500 flex items-center gap-1.5 text-xs">
            <NavLink
              to={`/configuration/automations`}
              className="text-default-500 hover:text-default-700 no-underline"
            >
              Automations
            </NavLink>
            <span>/</span>
            <span className="text-default-900 font-semibold dark:text-white">
              {rule.name}
            </span>
          </nav>
          {activeVersion && (
            <>
              <span className="text-default-600 text-xs font-medium">
                v{activeVersion.versionNumber}
              </span>
              {versionStatusBadge(rule.isPublished)}
            </>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <BaseButton
            size="sm"
            variant="bordered"
            color={showPalette ? 'primary' : undefined}
            onPress={() => setShowPalette(p => !p)}
          >
            Components
          </BaseButton>
          <BaseButton
            size="sm"
            variant="bordered"
            color="light"
            onPress={() => setShowVersionsSidebar(prev => !prev)}
          >
            Versions
          </BaseButton>
          {isDirty && (
            <BaseButton
              size="sm"
              variant="bordered"
              color="light"
              isDisabled={isSaving}
              onPress={handleSaveDraft}
            >
              Save Draft
            </BaseButton>
          )}
          <BaseButton
            size="sm"
            color="primary"
            isDisabled={isPublishing}
            onPress={handlePublish}
          >
            Publish
          </BaseButton>
        </div>
      </div>

      {/* Canvas + right sidebar */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Graph editor — keyed by active version so canvas remounts on version switch */}
        <div className="rules-editor-canvas min-w-0 flex-1 overflow-hidden min-h-[500px]">
          <GraphEditor
            key={activeVersion?.id ?? 'empty'}
            content={editableContent}
            onChange={handleContentChange}
            actionTypeCatalog={HELPDESK_ACTION_TYPES}
            inputFieldCatalog={HELPDESK_INPUT_FIELDS}
            outputFieldCatalog={HELPDESK_OUTPUT_FIELDS}
          />
        </div>

        {/* Node palette */}
        <NodePalette
          collapsed={!showPalette}
          onToggle={() => setShowPalette(false)}
        />

        {/* Versions sidebar */}
        {showVersionsSidebar && (
          <aside
            className="flex w-80 shrink-0 flex-col overflow-hidden border-l border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
            aria-label="Version history"
          >
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
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
              {rule.versions.length > 0 && (
                <BaseCard>
                  <div className="px-4 pb-2 pt-4">
                    <h3 className="text-default-700 text-sm font-semibold">
                      All Versions
                    </h3>
                  </div>
                  <ul className="divide-default-100 divide-y px-2 pb-2">
                    {reversedVersions.map(v => (
                      <li key={v.id} className="flex items-center gap-3 py-2.5">
                        <div className="flex-1">
                          <span className="text-sm font-medium">
                            v{v.versionNumber}
                          </span>
                          {v.name && (
                            <span className="text-default-400 ml-1 text-xs">
                              — {v.name}
                            </span>
                          )}
                          <span className="text-default-400 ml-2 text-xs">
                            {formatDate(v.createdAt)}
                          </span>
                        </div>
                        <BaseButton
                          size="sm"
                          variant="light"
                          color="success"
                          isDisabled={publishMutation.isPending}
                          onPress={() => handlePublishVersion(v)}
                        >
                          Publish
                        </BaseButton>
                      </li>
                    ))}
                  </ul>
                </BaseCard>
              )}

              {rule.versions.length === 0 && (
                <p className="text-default-400 text-xs italic">
                  No versions yet. Save or publish to create the first version.
                </p>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
