import { ScopeApi } from '@/api/helpdesk-client';
import { ModalHeader } from '@/components/shared';
import { useEntityScopeStrip } from '@/hooks/useEntityScopeStrip';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import { extractErrorMessage } from '@/utils/error-handling';
import {
  BaseInput,
  BaseModal,
  BaseModalBody,
  BaseModalContent,
  BaseModalFooter,
  RecordStrip,
} from '@brainforgeau/components';
import { BaseButton } from '@brainforgeau/components/button';
import { toast } from '@heroui/react';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  CUSTOM_PRIORITIES_QUERY_KEY,
  type CustomPriorityDto,
  useCreateCustomPriority,
  useUpdateCustomPriority,
} from '../hooks/useCustomPriorities';

const DEFAULT_COLOR = '#6366f1';

interface CustomPriorityEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  priority?: CustomPriorityDto;
  /** Names already in use, built-in and custom, to catch a duplicate here. */
  existingNames?: string[];
}

/**
 * Create or edit a custom priority, laid out like the custom status editor
 * so the two Configuration pages behave the same: name, sort order and
 * colour, and when editing, where the record lives.
 */
export function CustomPriorityEditorModal({
  isOpen,
  onClose,
  priority,
  existingNames = [],
}: CustomPriorityEditorModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [sortOrder, setSortOrder] = useState(0);
  const [nameError, setNameError] = useState('');

  const isEditing = !!priority?.id;
  const createMutation = useCreateCustomPriority();
  const updateMutation = useUpdateCustomPriority();
  const queryClient = useQueryClient();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const { stripProps: scopeStripProps } = useEntityScopeStrip({
    mode: 'modal',
    entityLabel: 'Custom priority',
    meta: priority?.meta,
    // entityType is the backend's CLR class name (DbSet<CustomPriority>).
    patchScope: async patch => {
      if (!priority?.id) return;
      const client = await createHelpdeskApiClient(ScopeApi);
      await client.v1ScopeEntityTypeIdPatch(
        'CustomPriority',
        priority.id,
        patch,
      );
    },
    onSaved: () => {
      queryClient.invalidateQueries({
        queryKey: [CUSTOM_PRIORITIES_QUERY_KEY],
      });
    },
  });

  useEffect(() => {
    if (!isOpen) return;
    setName(priority?.name ?? '');
    setColor(priority?.color ?? DEFAULT_COLOR);
    setSortOrder(priority?.sortOrder ?? 0);
    setNameError('');
  }, [isOpen, priority]);

  const validate = () => {
    if (!name.trim()) {
      setNameError('Name is required.');
      return false;
    }
    if (name.trim().length > 100) {
      setNameError('Name must be at most 100 characters.');
      return false;
    }
    const taken = existingNames.some(
      n =>
        n.trim().toLowerCase() === name.trim().toLowerCase() &&
        n.trim().toLowerCase() !== (priority?.name ?? '').trim().toLowerCase(),
    );
    if (taken) {
      setNameError('A priority with this name already exists.');
      return false;
    }
    setNameError('');
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    const payload = { name: name.trim(), color, sortOrder };
    try {
      if (isEditing && priority?.id) {
        await updateMutation.mutateAsync({ id: priority.id, payload });
        toast('Updated', {
          description: 'Custom priority updated',
          variant: 'success',
        });
      } else {
        await createMutation.mutateAsync(payload);
        toast('Created', {
          description: 'Custom priority created',
          variant: 'success',
        });
      }
      onClose();
    } catch (error) {
      toast("Couldn't save the priority", {
        description: extractErrorMessage(error, 'Please try again.'),
        variant: 'danger',
      });
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} size="md">
      <BaseModalContent>
        <ModalHeader>
          {isEditing ? 'Edit Custom Priority' : 'Create Custom Priority'}
        </ModalHeader>
        <BaseModalBody className="space-y-4">
          <BaseInput
            label="Name"
            placeholder="e.g. Urgent, VIP"
            value={name}
            onChange={e => setName(e.target.value)}
            isInvalid={!!nameError}
            errorMessage={nameError}
            maxLength={100}
            isRequired
          />

          {/* Placement only exists once the record does. */}
          {isEditing && <RecordStrip {...scopeStripProps} />}

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <BaseInput
                label="Sort Order"
                description="Where it appears in lists. Lower numbers come first."
                type="number"
                value={String(sortOrder)}
                onChange={e => setSortOrder(Number(e.target.value) || 0)}
                min={0}
              />
            </div>
            <div className="flex-1">
              <label
                htmlFor="custom-priority-color"
                className="text-gray block pb-1 text-xs font-bold leading-5 dark:text-light"
              >
                Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="custom-priority-color"
                  type="color"
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  className="border-light h-8 w-8 cursor-pointer rounded border"
                />
                <span className="text-default-500 text-sm">{color}</span>
              </div>
            </div>
          </div>
        </BaseModalBody>
        <BaseModalFooter>
          <BaseButton
            variant="bordered"
            color="light"
            onPress={onClose}
            isDisabled={isSubmitting}
          >
            Cancel
          </BaseButton>
          <BaseButton
            color="primary"
            onPress={handleSubmit}
            isDisabled={isSubmitting}
          >
            {isEditing ? 'Save Changes' : 'Create Priority'}
          </BaseButton>
        </BaseModalFooter>
      </BaseModalContent>
    </BaseModal>
  );
}
