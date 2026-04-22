import { useLogger } from '@brainforgeau/observability';
import { Spinner, addToast } from '@heroui/react';
import { useNavigate, useParams } from '@modern-js/runtime/router';
import { WorkflowEditor } from '../components/WorkflowEditor';
import {
  usePrincipalWorkflowDefinition,
  usePublishPrincipalDraft,
  useUpdatePrincipalDraft,
} from '../state/workflowQueries';
import type { WorkflowStateDto, WorkflowTransitionDto } from '../types';

export function PrincipalWorkflowEditorPage() {
  const { principalId, id } = useParams<{
    principalId: string;
    id: string;
  }>();
  const navigate = useNavigate();
  const logger = useLogger('PrincipalWorkflowEditorPage');
  const { data, isLoading, error } = usePrincipalWorkflowDefinition(
    principalId ?? '',
    id ?? null,
  );
  const updateMut = useUpdatePrincipalDraft();
  const publishMut = usePublishPrincipalDraft();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner label="Loading editor..." />
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

  const draft = data.draftVersion;

  if (!draft) {
    return (
      <div className="p-6">
        <button
          type="button"
          className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1"
          onClick={() => navigate(`/principal/${principalId}/workflows/${id}`)}
        >
          ← Back to Detail
        </button>
        <div className="text-sm text-gray-500">
          No draft available. Create one from the workflow detail page.
        </div>
      </div>
    );
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
        versionId: draft!.id,
        states,
        transitions,
        startStateId,
      });
      addToast({ title: 'Draft saved', severity: 'success' });
    } catch (err) {
      if (err instanceof Error) {
        logger.captureError(err, {
          context: 'principal_workflow_editor_save_failed',
        });
      } else {
        logger.error('principal_workflow_editor_save_failed');
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
        versionId: draft!.id,
      });
      addToast({ title: 'Workflow published', severity: 'success' });
      navigate(`/principal/${principalId}/workflows/${id}`);
    } catch (err) {
      if (err instanceof Error) {
        logger.captureError(err, {
          context: 'principal_workflow_editor_publish_failed',
        });
      } else {
        logger.error('principal_workflow_editor_publish_failed');
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
    <div className="flex flex-col h-full">
      <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-2">
        <button
          type="button"
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          onClick={() => navigate(`/principal/${principalId}/workflows/${id}`)}
        >
          ← {data.name}
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        <WorkflowEditor
          key={draft.id}
          definitionId={data.id}
          version={draft}
          onSaveDraft={handleSaveDraft}
          onPublish={handlePublish}
        />
      </div>
    </div>
  );
}
