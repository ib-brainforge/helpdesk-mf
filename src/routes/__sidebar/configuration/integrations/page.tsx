import { IntegrationEditorModal } from '@/components/integrations/components/IntegrationEditorModal';
import {
  useDeleteIntegration,
  useIntegrations,
} from '@/components/integrations/hooks/useIntegrations';
import { IconTip } from '@/components/shared';
import { INTEGRATION_PROVIDERS } from '@/types/integration';
import type {
  IntegrationConfigDto,
  IntegrationProviderMeta,
} from '@/types/integration';
import { BaseButton, BaseCard, Icon } from '@brainforgeau/components';
import {
  PageBody,
  PageHeader,
  useConfirm,
} from '@brainforgeau/components/page';
import { Card, CardContent, Chip, Spinner, toast } from '@heroui/react';
import { useState } from 'react';

function IntegrationsPage() {
  const { integrations, isLoading } = useIntegrations();
  const deleteMutation = useDeleteIntegration();
  const { confirm, dialog } = useConfirm();

  const [modalProvider, setModalProvider] =
    useState<IntegrationProviderMeta | null>(null);
  const [editingIntegration, setEditingIntegration] = useState<
    IntegrationConfigDto | undefined
  >();

  const openAdd = (provider: IntegrationProviderMeta) => {
    setEditingIntegration(undefined);
    setModalProvider(provider);
  };

  const openEdit = (integration: IntegrationConfigDto) => {
    const provider = INTEGRATION_PROVIDERS.find(
      p => p.type === integration.type,
    );
    if (!provider) return;
    setEditingIntegration(integration);
    setModalProvider(provider);
  };

  const handleDeleteRequest = async (integration: IntegrationConfigDto) => {
    const ok = await confirm({
      title: 'Remove Integration',
      body: `Remove "${integration.name}"? This cannot be undone.`,
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteMutation.mutateAsync(integration.id);
      toast('Removed', {
        description: `"${integration.name}" removed.`,
        variant: 'success',
      });
    } catch {
      toast('Error', {
        description: 'Failed to remove integration.',
        variant: 'danger',
      });
    }
  };

  // Group configured integrations by type for inline display under each tile
  const byType = integrations.reduce<Record<number, IntegrationConfigDto[]>>(
    (acc, i) => {
      if (!acc[i.type]) acc[i.type] = [];
      acc[i.type].push(i);
      return acc;
    },
    {},
  );

  return (
    <PageBody>
      <PageHeader
        title="Integrations"
        breadcrumbsKey="configuration.integrations.list"
      />

      {/* Routing disclaimer banner */}
      <BaseCard className="bg-light-blue dark:bg-blue-900/20 border-blue dark:border-blue-800 mb-5 max-w-3xl">
        <p className="text-warning-700 dark:text-warning-400 text-sm">
          <strong>Preview:</strong> Integration configurations are saved but
          event routing to external providers (Slack, Jira, GitHub, Zapier) is
          not yet active. You can configure credentials now and routing will
          pick them up automatically when it ships.
        </p>
      </BaseCard>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="grid max-w-4xl grid-cols-1 gap-4 md:grid-cols-2">
          {INTEGRATION_PROVIDERS.map(provider => {
            const instances = byType[provider.type] ?? [];
            return (
              <BaseCard key={provider.type}>
                {/* Provider header */}
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-default-100 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[3px]">
                      <Icon
                        name={provider.icon}
                        className="text-default-600 h-5 w-5"
                      />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">
                        {provider.label}
                      </h3>
                      <p className="text-default-500 mt-0.5 text-xs">
                        {provider.description}
                      </p>
                    </div>
                  </div>
                  <BaseButton
                    size="sm"
                    variant="bordered"
                    onPress={() => openAdd(provider)}
                    startContent={<Icon name="plus" className="h-3 w-3" />}
                  >
                    Add
                  </BaseButton>
                </div>

                {/* Existing instances */}
                {instances.length > 0 && (
                  <ul className="border-default-100 dark:border-default-700 mt-3 space-y-2 border-t pt-3">
                    {instances.map(instance => (
                      <li
                        key={instance.id}
                        className="bg-default-50 dark:bg-default-100/10 flex items-center justify-between rounded-lg px-3 py-2"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <Chip
                            size="sm"
                            color={instance.isEnabled ? 'success' : 'default'}
                          >
                            {instance.isEnabled ? 'Active' : 'Disabled'}
                          </Chip>
                          <span className="truncate text-sm">
                            {instance.name}
                          </span>
                        </div>
                        <div className="ml-2 flex flex-shrink-0 items-center gap-1">
                          <IconTip label={'Edit integration'}>
                            <BaseButton
                              isIconOnly
                              size="sm"
                              variant="light"
                              onPress={() => openEdit(instance)}
                              aria-label="Edit integration"
                            >
                              <Icon name="pencil" className="h-4 w-4" />
                            </BaseButton>
                          </IconTip>
                          <IconTip label={'Remove integration'}>
                            <BaseButton
                              isIconOnly
                              size="sm"
                              variant="light"
                              color="danger"
                              onPress={() => handleDeleteRequest(instance)}
                              isDisabled={deleteMutation.isPending}
                              aria-label="Remove integration"
                            >
                              <Icon name="trash" className="h-4 w-4" />
                            </BaseButton>
                          </IconTip>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {instances.length === 0 && (
                  <p className="text-default-400 border-default-100 dark:border-default-700 mt-3 border-t pt-3 text-xs">
                    No {provider.label} integrations configured.
                  </p>
                )}
              </BaseCard>
            );
          })}
        </div>
      )}

      {/* Editor modal — opened for a specific provider */}
      {modalProvider && (
        <IntegrationEditorModal
          isOpen={!!modalProvider}
          onClose={() => {
            setModalProvider(null);
            setEditingIntegration(undefined);
          }}
          provider={modalProvider}
          integration={editingIntegration}
        />
      )}

      {dialog}
    </PageBody>
  );
}

export default IntegrationsPage;
