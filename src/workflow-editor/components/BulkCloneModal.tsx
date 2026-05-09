import {
  BaseButton,
  BaseInput,
  BaseModal,
  BaseModalBody,
  BaseModalContent,
  BaseModalFooter,
  BaseModalHeader,
  BaseTextarea,
} from '@brainforgeau/components';

import { useNavigate } from '@modern-js/runtime/router';
import { toast } from '@heroui/react';
import { useState } from 'react';
import { useCloneDefinition } from '../state/workflowQueries';

export interface BulkCloneModalProps {
  isOpen: boolean;
  onOpenChange: (next: boolean) => void;
  sourceDefinitionId: string;
  sourceDefinitionName: string;
  /** If provided, clones into principal scope */
  principalId?: string;
  /** Navigate to tenant or principal detail URL after clone */
  getDetailUrl: (newId: string) => string;
}

export function BulkCloneModal({
  isOpen,
  onOpenChange,
  sourceDefinitionId,
  sourceDefinitionName,
  principalId,
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
        principalId,
      });
      toast(`Cloned as "${result.name}"`, { variant: 'success' });
      onClose();
      navigate(getDetailUrl(result.id));
    } catch (err) {
      toast('Clone failed', { description: err instanceof Error ? err.message : 'Unknown error', variant: 'danger' });
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
            <BaseModalHeader>Clone Workflow</BaseModalHeader>
            <BaseModalBody>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
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
