import { ModalHeader } from '@/components/shared';
import {
  BaseButton,
  BaseInput,
  BaseModal,
  BaseModalBody,
  BaseModalContent,
  BaseModalFooter,
  BaseTextarea,
} from '@brainforgeau/components';

import { toast } from '@heroui/react';
import { useNavigate } from '@modern-js/runtime/router';
import { useState } from 'react';
import { useCloneDefinition } from '../state/workflowQueries';

export interface BulkCloneModalProps {
  isOpen: boolean;
  onOpenChange: (next: boolean) => void;
  sourceDefinitionId: string;
  sourceDefinitionName: string;
  /** Where the cloned workflow's page lives. */
  getDetailUrl: (newId: string) => string;
}

export function BulkCloneModal({
  isOpen,
  onOpenChange,
  sourceDefinitionId,
  sourceDefinitionName,
  getDetailUrl,
}: BulkCloneModalProps) {
  const navigate = useNavigate();
  const cloneMutation = useCloneDefinition();
  const [newName, setNewName] = useState(`${sourceDefinitionName} (copy)`);
  const [newDescription, setNewDescription] = useState('');

  async function handleClone(onClose: () => void) {
    if (!newName.trim()) return;
    try {
      const result = await cloneMutation.mutateAsync({
        sourceDefinitionId,
        newName: newName.trim(),
        newDescription: newDescription.trim() || undefined,
      });
      toast(`Cloned as "${result.name}"`, { variant: 'success' });
      onClose();
      navigate(getDetailUrl(result.id));
    } catch (err: any) {
      onClose();
      if (err?.partialResult) {
        toast('Cloned (content copy incomplete)', {
          description:
            'The workflow was created but states could not be copied. You can manually rebuild it.',
          variant: 'warning',
        });
        navigate(getDetailUrl(err.partialResult.id));
      } else {
        toast('Clone failed', {
          description: err instanceof Error ? err.message : 'Unknown error',
          variant: 'danger',
        });
      }
    }
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onOpenChange={open => {
        onOpenChange(open);
        if (!open) {
          setNewName(`${sourceDefinitionName} (copy)`);
          setNewDescription('');
        }
      }}
      size="md"
    >
      <BaseModalContent>
        {onClose => (
          <>
            <ModalHeader>Clone Workflow</ModalHeader>
            <BaseModalBody>
              <div className="space-y-4">
                <p className="text-sm text-default-600">
                  Creates a new workflow definition with a draft version copied
                  from <strong>{sourceDefinitionName}</strong>.
                </p>
                <BaseInput
                  label="New Workflow Name"
                  value={newName}
                  onValueChange={setNewName}
                  labelPlacement="outside"
                  placeholder="e.g. Standard Helpdesk (copy)"
                  isRequired
                />
                <BaseTextarea
                  label="Description (optional)"
                  value={newDescription}
                  onValueChange={setNewDescription}
                  labelPlacement="outside"
                  minRows={2}
                  placeholder="Leave empty to inherit from source"
                />
              </div>
            </BaseModalBody>
            <BaseModalFooter>
              <BaseButton variant="light" onPress={onClose}>
                Cancel
              </BaseButton>
              <BaseButton
                color="primary"
                isDisabled={cloneMutation.isPending || !newName.trim()}
                onPress={() => handleClone(onClose)}
              >
                Clone
              </BaseButton>
            </BaseModalFooter>
          </>
        )}
      </BaseModalContent>
    </BaseModal>
  );
}
