import {
  BaseButton,
} from '@brainforgeau/components';
import { useLogger } from '@brainforgeau/observability';
import { addToast } from '@heroui/react';
import { useState } from 'react';
import { useValidateVersion } from '../state/workflowQueries';
import type { WorkflowDefinitionVersionDto } from '../types';
import { VersionBadge } from './VersionBadge';

interface WorkflowToolbarProps {
  version: WorkflowDefinitionVersionDto;
  dirty: boolean;
  readOnly?: boolean;
  onSaveDraft?: () => Promise<unknown> | void;
  onPublish?: () => Promise<unknown> | void;
  definitionId?: string;
}

export function WorkflowToolbar({
  version,
  dirty,
  readOnly,
  onSaveDraft,
  onPublish,
  definitionId,
}: WorkflowToolbarProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const validateMutation = useValidateVersion();
  const logger = useLogger('WorkflowToolbar');

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
    if (!definitionId) return;
    try {
      const result = await validateMutation.mutateAsync({
        definitionId,
        versionId: version.id,
      });
      if (result.isValid) {
        setValidationErrors([]);
        addToast({ title: 'Validation passed', severity: 'success' });
      } else {
        const errors = result.errors.map(e => e.message);
        setValidationErrors(errors);
        logger.warn('workflow_toolbar_validation_failed', {
          definitionId,
          versionId: version.id,
          errorCount: errors.length,
        });
      }
    } catch (err) {
      logger.captureError(err instanceof Error ? err : new Error(String(err)), {
        context: 'workflow_toolbar_validate_failed',
      });
      addToast({
        title: 'Validation request failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        severity: 'danger',
      });
    }
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 bg-white flex-wrap">
      {/* Version info */}
      <div className="flex items-center gap-2 mr-2">
        <span className="text-sm font-medium text-gray-700">
          v{version.versionNumber}
        </span>
        <VersionBadge status={version.status} />
      </div>

      <div className="flex-1" />

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <div
          className="text-xs text-red-600 max-w-xs truncate"
          title={validationErrors.join('; ')}
        >
          {validationErrors.length} validation error
          {validationErrors.length > 1 ? 's' : ''}
        </div>
      )}

      {!readOnly && (
        <>
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
            color="primary"
            variant="bordered"
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
      )}
    </div>
  );
}
