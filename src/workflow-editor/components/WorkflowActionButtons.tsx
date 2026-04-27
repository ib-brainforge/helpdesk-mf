import { BaseButton } from '@brainforgeau/components';
import { useLogger } from '@brainforgeau/observability';
import { addToast } from '@heroui/react';
import { useState } from 'react';
import { useValidateVersion } from '../state/workflowQueries';

export interface WorkflowActionButtonsProps {
  definitionId: string;
  versionId: string;
  dirty: boolean;
  onSaveDraft?: () => Promise<unknown> | void;
  onPublish?: () => Promise<unknown> | void;
}

/**
 * Validate / Save Draft / Publish action cluster — renders inline in the
 * detail-page top bar. Combined into a single row so the editor chrome
 * does not waste a second bar on actions.
 */
export function WorkflowActionButtons({
  definitionId,
  versionId,
  dirty,
  onSaveDraft,
  onPublish,
}: WorkflowActionButtonsProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const validateMutation = useValidateVersion();
  const logger = useLogger('WorkflowActionButtons');

  async function handleSave() {
    if (!onSaveDraft) return;
    setIsSaving(true);
    try {
      await onSaveDraft();
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePublish() {
    if (!onPublish) return;
    setIsPublishing(true);
    try {
      await onPublish();
    } finally {
      setIsPublishing(false);
    }
  }

  async function handleValidate() {
    try {
      const result = await validateMutation.mutateAsync({
        definitionId,
        versionId,
      });
      if (result.isValid) {
        setValidationErrors([]);
        addToast({ title: 'Validation passed', severity: 'success' });
      } else {
        const errors = result.errors.map(e => e.message);
        setValidationErrors(errors);
        logger.warn('workflow_validation_failed', {
          definitionId,
          versionId,
          errorCount: errors.length,
        });
      }
    } catch (err) {
      logger.captureError(err instanceof Error ? err : new Error(String(err)), {
        context: 'workflow_validate_failed',
      });
      addToast({
        title: 'Validation request failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        severity: 'danger',
      });
    }
  }

  return (
    <>
      {validationErrors.length > 0 && (
        <div
          className="max-w-xs truncate text-xs text-danger"
          title={validationErrors.join('; ')}
        >
          {validationErrors.length} validation error
          {validationErrors.length > 1 ? 's' : ''}
        </div>
      )}
      <BaseButton
        size="sm"
        variant="bordered"
        onPress={handleValidate}
        isLoading={validateMutation.isPending}
      >
        Validate
      </BaseButton>
      <BaseButton
        size="sm"
        variant="bordered"
        color="primary"
        onPress={handleSave}
        isDisabled={!dirty}
        isLoading={isSaving}
      >
        Save Draft
      </BaseButton>
      <BaseButton
        size="sm"
        color="primary"
        onPress={handlePublish}
        isDisabled={dirty}
        isLoading={isPublishing}
      >
        Publish
      </BaseButton>
    </>
  );
}
