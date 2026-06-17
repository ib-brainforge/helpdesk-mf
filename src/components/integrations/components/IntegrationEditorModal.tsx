import { INTEGRATION_PROVIDERS } from '@/types/integration';
import type {
  IntegrationConfigDto,
  IntegrationProviderMeta,
} from '@/types/integration';
import {
  BaseInput,
  BaseModal,
  BaseModalBody,
  BaseModalContent,
  BaseModalFooter,
  BaseModalHeader,
  BaseToggle,
} from '@brainforgeau/components';
import { BaseButton } from '@brainforgeau/components/button';
import { toast } from '@heroui/react';
import { useEffect, useState } from 'react';
import {
  useAddIntegration,
  useUpdateIntegration,
} from '../hooks/useIntegrations';

interface IntegrationEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Provider meta for the tile that was clicked — drives the config fields. */
  provider: IntegrationProviderMeta;
  /** Set when editing an existing integration instance. */
  integration?: IntegrationConfigDto;
}

function parseConfigJson(json: string): Record<string, string> {
  try {
    return JSON.parse(json) as Record<string, string>;
  } catch {
    return {};
  }
}

export function IntegrationEditorModal({
  isOpen,
  onClose,
  provider,
  integration,
}: IntegrationEditorModalProps) {
  const [name, setName] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [nameError, setNameError] = useState('');

  const isEditing = !!integration;
  const addMutation = useAddIntegration();
  const updateMutation = useUpdateIntegration();
  const isSubmitting = addMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (isOpen) {
      if (integration) {
        setName(integration.name);
        setIsEnabled(integration.isEnabled);
        setFieldValues(parseConfigJson(integration.configJson));
      } else {
        setName(`${provider.label} integration`);
        setIsEnabled(true);
        setFieldValues({});
      }
      setNameError('');
    }
  }, [isOpen, integration, provider]);

  const handleFieldChange = (key: string, value: string) => {
    setFieldValues(prev => ({ ...prev, [key]: value }));
  };

  const buildConfigJson = (): string => {
    return JSON.stringify(fieldValues);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setNameError('Name is required.');
      return;
    }
    setNameError('');

    try {
      if (isEditing && integration) {
        await updateMutation.mutateAsync({
          id: integration.id,
          payload: {
            name: name.trim(),
            isEnabled,
            configJson: buildConfigJson(),
          },
        });
        toast('Saved', {
          description: `${provider.label} integration updated.`,
          variant: 'success',
        });
      } else {
        await addMutation.mutateAsync({
          type: provider.type,
          name: name.trim(),
          isEnabled,
          configJson: buildConfigJson(),
        });
        toast('Added', {
          description: `${provider.label} integration configured.`,
          variant: 'success',
        });
      }
      onClose();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail;
      if (message?.includes('INTEGRATION_NAME_DUPLICATE')) {
        setNameError('An integration with this name already exists.');
      } else {
        toast('Error', {
          description: 'Failed to save integration.',
          variant: 'danger',
        });
      }
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} size="md">
      <BaseModalContent>
        <BaseModalHeader>
          {isEditing
            ? `Edit ${provider.label} integration`
            : `Configure ${provider.label}`}
        </BaseModalHeader>

        <BaseModalBody className="space-y-4">
          {/* Routing disclaimer */}
          <div className="rounded-lg bg-warning-50 dark:bg-warning-100/10 border border-warning-200 dark:border-warning-800 px-4 py-3">
            <p className="text-xs text-warning-700 dark:text-warning-400">
              <strong>Configuration only.</strong> Storing credentials here
              enables the routing infrastructure when it ships. Event delivery
              to {provider.label} is not yet active.
            </p>
          </div>

          {/* Name */}
          <BaseInput
            label="Integration name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={`${provider.label} integration`}
            isRequired
            errorMessage={nameError}
            isInvalid={!!nameError}
          />

          {/* Enabled */}
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Enabled</p>
              <p className="text-xs text-default-500">
                When off, this integration will be skipped by the routing layer.
              </p>
            </div>
            <BaseToggle isSelected={isEnabled} onChange={setIsEnabled} />
          </div>

          {/* Provider-specific config fields */}
          {provider.configFields.map(field => (
            <BaseInput
              key={field.key}
              label={field.label}
              placeholder={field.placeholder}
              value={fieldValues[field.key] ?? ''}
              onChange={e => handleFieldChange(field.key, e.target.value)}
              type={field.secret ? 'password' : 'text'}
              isRequired={field.required}
              description={
                field.secret
                  ? 'Stored securely. Leave blank to keep the existing value.'
                  : undefined
              }
            />
          ))}
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
            {isEditing ? 'Save Changes' : 'Add Integration'}
          </BaseButton>
        </BaseModalFooter>
      </BaseModalContent>
    </BaseModal>
  );
}
