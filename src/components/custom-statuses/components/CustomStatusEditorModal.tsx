import { useEntityScopeStrip } from '@/hooks/useEntityScopeStrip';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import { TicketStatus } from '@/types/custom-status';
import type { CustomTicketStatusDto } from '@/types/custom-status';
import {
  BaseInput,
  BaseModal,
  BaseModalBody,
  BaseModalContent,
  BaseModalFooter,
  BaseModalHeader,
  BaseSelect,
  BaseSelectItem,
  BaseToggle,
  ContextScopeStrip,
} from '@brainforgeau/components';
import { BaseButton } from '@brainforgeau/components/button';
import { ScopeApi } from '@brainforgeau/helpdesk-client';
import { toast } from '@heroui/react';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  useCreateCustomStatus,
  useUpdateCustomStatus,
} from '../hooks/useCustomStatuses';

const CUSTOM_STATUSES_QUERY_KEY = 'helpdesk-custom-statuses';

interface CustomStatusEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  status?: CustomTicketStatusDto;
}

const MAPS_TO_OPTIONS = [
  { value: TicketStatus.New, label: 'New' },
  { value: TicketStatus.InProgress, label: 'In Progress' },
  { value: TicketStatus.Closed, label: 'Closed' },
];

export function CustomStatusEditorModal({
  isOpen,
  onClose,
  status,
}: CustomStatusEditorModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [sortOrder, setSortOrder] = useState(0);
  const [mapsToStatus, setMapsToStatus] = useState<TicketStatus>(
    TicketStatus.InProgress,
  );
  const [isClosed, setIsClosed] = useState(false);
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [nameError, setNameError] = useState('');

  const isEditing = !!status;

  const createMutation = useCreateCustomStatus();
  const updateMutation = useUpdateCustomStatus();
  const queryClient = useQueryClient();

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // DTO tenancy/scope metadata initiative -- only meaningful once the status
  // exists (has an id/meta), so the strip below is gated on `isEditing`. The
  // hook itself is always called (rules of hooks) with `meta: undefined` in
  // create mode, which every downstream computation here already treats as
  // "no scope yet" the same way a freshly-created record would.
  const { stripProps: scopeStripProps } = useEntityScopeStrip({
    mode: 'modal',
    entityLabel: 'Custom status',
    meta: status?.meta,
    patchScope: async patch => {
      if (!status) return;
      const client = await createHelpdeskApiClient(ScopeApi);
      // entityType verified against helpdesk-backend's `HelpdeskDbContext`
      // (`DbSet<CustomTicketStatus> CustomTicketStatuses`).
      await client.v1ScopeEntityTypeIdPatch(
        'CustomTicketStatus',
        status.id,
        patch,
      );
    },
    onSaved: () => {
      queryClient.invalidateQueries({
        queryKey: [CUSTOM_STATUSES_QUERY_KEY],
      });
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (status) {
        setName(status.name);
        setColor(status.color ?? '#6366f1');
        setSortOrder(status.sortOrder);
        setMapsToStatus(status.mapsToStatus);
        setIsClosed(status.isClosed);
        setIsDefault(status.isDefault);
        setIsActive(status.isActive);
      } else {
        setName('');
        setColor('#6366f1');
        setSortOrder(0);
        setMapsToStatus(TicketStatus.InProgress);
        setIsClosed(false);
        setIsDefault(false);
        setIsActive(true);
      }
      setNameError('');
    }
  }, [isOpen, status]);

  const validate = () => {
    if (!name.trim()) {
      setNameError('Name is required.');
      return false;
    }
    if (name.trim().length > 100) {
      setNameError('Name must be at most 100 characters.');
      return false;
    }
    setNameError('');
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          id: status.id,
          payload: {
            name: name.trim(),
            color,
            sortOrder,
            mapsToStatus,
            isClosed,
            isDefault,
            isActive,
          },
        });
        toast('Updated', {
          description: 'Custom status updated successfully',
          variant: 'success',
        });
      } else {
        await createMutation.mutateAsync({
          name: name.trim(),
          color,
          sortOrder,
          mapsToStatus,
          isClosed,
          isDefault,
        });
        toast('Created', {
          description: 'Custom status created successfully',
          variant: 'success',
        });
      }
      onClose();
    } catch {
      toast('Error', {
        description: 'Failed to save custom status',
        variant: 'danger',
      });
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} size="md">
      <BaseModalContent>
        <BaseModalHeader>
          {isEditing ? 'Edit Custom Status' : 'Create Custom Status'}
        </BaseModalHeader>
        <BaseModalBody className="space-y-4">
          <BaseInput
            label="Name"
            placeholder="e.g. Awaiting Customer Reply"
            value={name}
            onChange={e => setName(e.target.value)}
            isInvalid={!!nameError}
            errorMessage={nameError}
            maxLength={100}
            isRequired
          />

          {/* Scope strip (DTO tenancy/scope metadata initiative) -- only
              meaningful once the record exists (has an id/meta); the create
              form has nothing to place yet. */}
          {isEditing && <ContextScopeStrip {...scopeStripProps} />}

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <BaseInput
                label="Sort Order"
                type="number"
                value={String(sortOrder)}
                onChange={e => setSortOrder(Number(e.target.value) || 0)}
                min={0}
              />
            </div>
            <div className="flex-1">
              <label className="text-foreground mb-1.5 block text-sm font-medium">
                Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  className="border-light h-10 w-10 cursor-pointer rounded border"
                />
                <span className="text-default-500 text-sm">{color}</span>
              </div>
            </div>
          </div>

          <BaseSelect
            label="Maps to system status"
            selectedKey={String(mapsToStatus)}
            onSelectionChange={keys => {
              const key = keys as string;
              setMapsToStatus(Number(key) as TicketStatus);
            }}
          >
            {MAPS_TO_OPTIONS.map(opt => (
              <BaseSelectItem key={String(opt.value)} value={String(opt.value)}>
                {opt.label}
              </BaseSelectItem>
            ))}
          </BaseSelect>

          <div className="bg-default-50 border-light space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Counts as closed</p>
                <p className="text-default-500 text-xs">
                  Tickets with this status are counted as resolved in reports
                </p>
              </div>
              <BaseToggle isSelected={isClosed} onChange={setIsClosed} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Default for new tickets</p>
                <p className="text-default-500 text-xs">
                  New tickets will start with this status
                </p>
              </div>
              <BaseToggle isSelected={isDefault} onChange={setIsDefault} />
            </div>

            {isEditing && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Active</p>
                  <p className="text-default-500 text-xs">
                    Inactive statuses are hidden from selection
                  </p>
                </div>
                <BaseToggle isSelected={isActive} onChange={setIsActive} />
              </div>
            )}
          </div>
        </BaseModalBody>
        <BaseModalFooter>
          <BaseButton
            variant="bordered"
            onPress={onClose}
            isDisabled={isSubmitting || isSubmitting}
          >
            Cancel
          </BaseButton>
          <BaseButton color="primary" onPress={handleSubmit}>
            {isEditing ? 'Save Changes' : 'Create Status'}
          </BaseButton>
        </BaseModalFooter>
      </BaseModalContent>
    </BaseModal>
  );
}
