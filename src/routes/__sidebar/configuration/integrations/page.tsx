import { Breadcrumbs } from '@/components/Breadcrumbs';
import { IntegrationEditorModal } from '@/components/integrations/components/IntegrationEditorModal';
import {
  useDeleteIntegration,
  useIntegrations,
} from '@/components/integrations/hooks/useIntegrations';
import { ConfirmDeleteModal } from '@/components/principal/ConfirmDeleteModal';
import { INTEGRATION_PROVIDERS, IntegrationType } from '@/types/integration';
import type {
  IntegrationConfigDto,
  IntegrationProviderMeta,
} from '@/types/integration';
import { BaseButton, Icon } from '@brainforgeau/components';
import { Card, CardContent, Chip, Spinner, toast } from '@heroui/react';
import { Helmet } from '@modern-js/runtime/head';
import { useState } from 'react';

function IntegrationsPage() {
  const { integrations, isLoading } = useIntegrations();
  const deleteMutation = useDeleteIntegration();

  const [modalProvider, setModalProvider] =
    useState<IntegrationProviderMeta | null>(null);
  const [editingIntegration, setEditingIntegration] = useState<
    IntegrationConfigDto | undefined
  >();
  const [pendingDelete, setPendingDelete] =
    useState<IntegrationConfigDto | null>(null);

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

  const handleDeleteRequest = (integration: IntegrationConfigDto) => {
    setPendingDelete(integration);
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDelete) return;
    try {
      await deleteMutation.mutateAsync(pendingDelete.id);
      toast('Removed', { description: `"${pendingDelete.name}" removed.`, variant: 'success' });
    } catch {
      toast('Error', { description: 'Failed to remove integration.', variant: 'danger' });
    } finally {
      setPendingDelete(null);
    }
  };

  // Group configured integrations by type for inline display under each tile
  const byType = integrations.reduce<Record<number, IntegrationConfigDto[]>>(
    (acc, i) => {
      (acc[i.type] ??= []).push(i);
      return acc;
    },
    {},
  );

  return (
    <>
      <Helmet>
        <title>Integrations - Helpdesk</title>
      </Helmet>

      <div className="mb-6">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Administration', href: '/admin/settings' },
            {
              label: 'Integrations',
              href: '/configuration/integrations',
              isCurrent: true,
            },
          ]}
        />
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Integrations</h1>
        <p className="text-default-500 mt-1">
          Connect Helpdesk with third-party tools. Configuration is stored ready
          for when routing ships.
        </p>
      </div>

      {/* Routing disclaimer banner */}
      <div className="mb-6 rounded-lg bg-warning-50 border border-warning-200 px-4 py-3 max-w-3xl">
        <p className="text-sm text-warning-700">
          <strong>Preview:</strong> Integration configurations are saved but
          event routing to external providers (Slack, Jira, GitHub, Zapier) is
          not yet active. You can configure credentials now and routing will
          pick them up automatically when it ships.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
          {INTEGRATION_PROVIDERS.map(provider => {
            const instances = byType[provider.type] ?? [];
            return (
              <Card
                key={provider.type}
                className="shadow-none border border-default-200"
              >
                <CardContent className="p-5">
                  {/* Provider header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-default-100 flex items-center justify-center flex-shrink-0">
                        <Icon
                          name={provider.icon}
                          className="w-5 h-5 text-default-600"
                        />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold">
                          {provider.label}
                        </h3>
                        <p className="text-xs text-default-500 mt-0.5">
                          {provider.description}
                        </p>
                      </div>
                    </div>
                    <BaseButton
                      size="sm"
                      variant="bordered"
                      onPress={() => openAdd(provider)}
                      startContent={<Icon name="plus" className="w-3 h-3" />}
                    >
                      Add
                    </BaseButton>
                  </div>

                  {/* Existing instances */}
                  {instances.length > 0 && (
                    <ul className="space-y-2 mt-3 pt-3 border-t border-default-100">
                      {instances.map(instance => (
                        <li
                          key={instance.id}
                          className="flex items-center justify-between px-3 py-2 rounded-lg bg-default-50"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Chip
                              size="sm"
                              color={instance.isEnabled ? 'success' : 'default'}
                             
                            >
                              {instance.isEnabled ? 'Active' : 'Disabled'}
                            </Chip>
                            <span className="text-sm truncate">
                              {instance.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                            <BaseButton
                              isIconOnly
                              size="sm"
                              variant="light"
                              onPress={() => openEdit(instance)}
                            >
                              <Icon name="pencil" className="w-4 h-4" />
                            </BaseButton>
                            <BaseButton
                              isIconOnly
                              size="sm"
                              variant="light"
                              color="danger"
                              onPress={() => handleDeleteRequest(instance)}
                              isDisabled={deleteMutation.isPending}
                            >
                              <Icon name="trash" className="w-4 h-4" />
                            </BaseButton>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  {instances.length === 0 && (
                    <p className="text-xs text-default-400 mt-3 pt-3 border-t border-default-100">
                      No {provider.label} integrations configured.
                    </p>
                  )}
                </CardContent>
              </Card>
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

      <ConfirmDeleteModal
        isOpen={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Remove Integration"
        message={`Remove "${pendingDelete?.name}"? This cannot be undone.`}
        isPending={deleteMutation.isPending}
      />
    </>
  );
}

export default IntegrationsPage;
