import { Icon } from '@brainforgeau/components/base';
import { BulkScopeEditor } from '@brainforgeau/components/bulk-scope-editor';
import { BaseButton } from '@brainforgeau/components/button';
import { ListScopeStrip } from '@brainforgeau/components/list-scope-strip';
import { useScopeList } from '@brainforgeau/components/scope-list';
import {
  CustomFieldEditorModal,
  createCustomFieldsColumns,
  useCustomFieldsData,
  useCustomFieldsTable,
} from '@components/custom-fields';

import {
  PlatformPermissions,
  useAccessScope,
  usePermissions,
} from '@/security';
import { selectedContextAtom } from '@/state/auth-atoms';
import { requireIdentityApiBaseUrl } from '@/state/config';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type { CustomFieldDefinitionDto } from '@/types/custom-field';
import {
  toBulkScopeSaveResult,
  toHelpdeskScopePatch,
  toWireMeta,
} from '@/utils/scopeMeta';
import { SCOPE_TESTING_BYPASS_SINGLE_ORG } from '@/utils/scopeTestingBypass';
import {
  EmptyState,
  ListPage,
  useConfirm,
} from '@brainforgeau/components/page';
import { CustomFieldsApi, ScopeApi } from '@brainforgeau/helpdesk-client';
import { toast } from '@heroui/react';
import { useSearchParams } from '@modern-js/runtime/router';
import { useMutation } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { useCallback, useMemo, useState } from 'react';

type CustomFieldTabType = 'tickets' | 'users' | 'companies' | 'assets';

const TAB_LABELS: Record<CustomFieldTabType, string> = {
  tickets: 'Custom fields (Tickets)',
  users: 'Custom fields (Users)',
  companies: 'Custom fields (Companies)',
  assets: 'Custom fields (Assets)',
};

const CUSTOM_FIELD_VALID_TABS = new Set<string>([
  'tickets',
  'users',
  'companies',
  'assets',
]);
const CUSTOM_FIELD_DEFAULT_TAB: CustomFieldTabType = 'tickets';

function CustomFieldsPage() {
  // URL query-param tab persistence: ?tab=<key> synced to selected tab.
  // Falls back to the first tab (CUSTOM_FIELD_DEFAULT_TAB) when the param is absent or unknown.
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTab: CustomFieldTabType = (() => {
    const param = searchParams.get('tab');
    return param && CUSTOM_FIELD_VALID_TABS.has(param)
      ? (param as CustomFieldTabType)
      : CUSTOM_FIELD_DEFAULT_TAB;
  })();
  const setSelectedTab = (key: CustomFieldTabType) => {
    setSearchParams(
      prev => {
        prev.set('tab', key);
        return prev;
      },
      { replace: true },
    );
  };
  const {
    items,
    allItems,
    totalCount,
    pagination,
    setPagination,
    isLoading,
    refetch,
  } = useCustomFieldsData();
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<
    CustomFieldDefinitionDto | undefined
  >(undefined);
  const { confirm, dialog } = useConfirm();

  // DTO tenancy/scope metadata initiative -- see useAccessScope for why this
  // isn't @brainforgeau/security's useHierarchicalContext. Fed `allItems`
  // (the full unpaginated set), NOT `items` (the current client-side-
  // paginated page) -- see `useCustomFieldsData`'s own doc comment on
  // `allItems`. Only the "tickets" tab has real data (see `selectedTab`
  // below); the other tabs are placeholders with nothing to scope.
  const selectedContext = useAtomValue(selectedContextAtom);
  const { accessScope, organisationCount } = useAccessScope(
    selectedContext?.tenantId,
    { identityBaseUrl: requireIdentityApiBaseUrl() },
  );
  const { hasPlatformPermission } = usePermissions();
  const canManageScope = hasPlatformPermission(
    PlatformPermissions.Scope.Manage,
  );
  const currentOrganisationId = selectedContext?.organisationId;
  const currentDivisionId = selectedContext?.divisionId;

  const scope = useScopeList({
    rows: allItems,
    getMeta: row => toWireMeta(row.meta),
    getRecordId: row => row.id,
    getRecordLabel: row => row.name,
    accessScope,
    selectedContext,
    canManageScope,
    canViewScope: hasPlatformPermission(PlatformPermissions.Scope.Read),
    // entityType verified against helpdesk-backend's `HelpdeskDbContext`
    // (`DbSet<CustomFieldDefinition> CustomFieldDefinitions`).
    patchScope: async (ids, patch) => {
      const client = await createHelpdeskApiClient(ScopeApi);
      const response = await client.v1ScopeEntityTypePatch(
        'CustomFieldDefinition',
        { ids, patch: toHelpdeskScopePatch(patch) },
      );
      return toBulkScopeSaveResult(response.data);
    },
    refetch: async () => {
      refetch();
    },
    // REVIEW: TEMPORARY -- see SCOPE_TESTING_BYPASS_SINGLE_ORG's doc comment
    // in scopeTestingBypass.ts. Remove this line to revert.
    bypassSingleOrganisationSuppressionForTesting:
      SCOPE_TESTING_BYPASS_SINGLE_ORG,
    entityLabel: { one: 'custom field', other: 'custom fields' },
  });

  const deleteMutation = useMutation({
    mutationFn: async (fieldId: string) => {
      const client = await createHelpdeskApiClient(CustomFieldsApi);
      await client.v1CustomFieldsIdDelete(fieldId);
    },
    onSuccess: () => {
      toast('Custom field deleted successfully', { variant: 'success' });
      refetch();
    },
    onError: () => {
      // Error handled by global axios interceptor
    },
  });

  const handleEdit = useCallback(
    (fieldId: string) => {
      const field = items.find(item => item.id === fieldId);
      if (field) {
        setEditingField(field);
        setIsEditorModalOpen(true);
      }
    },
    [items],
  );

  const handleDelete = useCallback(
    async (fieldId: string) => {
      const field = items.find(item => item.id === fieldId);
      const ok = await confirm({
        title: 'Delete Custom Field',
        body: `Delete "${field?.name ?? 'this field'}"? This cannot be undone.`,
        confirmLabel: 'Delete',
        destructive: true,
      });
      if (!ok) return;
      deleteMutation.mutate(fieldId);
    },
    [confirm, deleteMutation, items],
  );

  const handleCreate = () => {
    setEditingField(undefined);
    setIsEditorModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsEditorModalOpen(false);
    setEditingField(undefined);
  };

  const columns = useMemo(
    () =>
      createCustomFieldsColumns({
        onEdit: handleEdit,
        onDelete: handleDelete,
        currentOrganisationId,
        currentDivisionId,
        organisationCount,
      }),
    [
      handleEdit,
      handleDelete,
      currentOrganisationId,
      currentDivisionId,
      organisationCount,
    ],
  );

  const { table } = useCustomFieldsTable({
    // Only pass real data when on the tickets tab — other tabs are not yet implemented
    data: selectedTab === 'tickets' ? items : [],
    columns,
    totalCount: selectedTab === 'tickets' ? totalCount : 0,
    pagination,
    onPaginationChange: setPagination,
    // Keys row selection by the record's own id, matching `useScopeList`'s
    // `getRecordId` above -- required so `scope.rowSelection` (keyed by id)
    // and the table's own selection checkboxes agree on the same keys.
    rowSelection: scope.rowSelection,
    onRowSelectionChange: scope.onRowSelectionChange,
  });

  const sidebar = (
    <nav className="border-light min-h-full space-y-1 border-r pr-6">
      {(Object.keys(TAB_LABELS) as CustomFieldTabType[]).map(key => (
        <button
          key={key}
          type="button"
          onClick={() => setSelectedTab(key)}
          // REVIEW: Replaced bg-primary/text-white (low contrast, hard to see) with a
          // left-border + bg-default-100 active pattern consistent with other sub-navs.
          className={`w-full rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
            selectedTab === key
              ? 'border-l-4 border-primary bg-primary-50 pl-2 text-primary'
              : 'text-default-700 hover:bg-default-100'
          }`}
        >
          {TAB_LABELS[key]}
        </button>
      ))}
    </nav>
  );

  return (
    <ListPage
      title="Custom Fields"
      breadcrumbsKey="configuration.custom-fields.list"
      table={table}
      isLoading={selectedTab === 'tickets' ? isLoading : false}
      // `selectionColumn`'s checkboxes are now wired to `scope.rowSelection`/
      // `onRowSelectionChange` (via `useCustomFieldsTable`'s new
      // `rowSelection`/`onRowSelectionChange` params above) -- selecting
      // rows here feeds `editorProps.selectedRecords`, so "Change scope"
      // (rendered inside `ListScopeStrip`'s `subheader` below) bulk-edits the
      // selection, same as `rowMarker`'s per-row scope border.
      tableProps={scope.tableProps}
      actions={
        <BaseButton
          icon={<Icon name="plus" className="h-3.5 w-3.5" />}
          onPress={handleCreate}
        >
          Custom Field
        </BaseButton>
      }
      sidebar={sidebar}
      subheader={
        selectedTab === 'tickets' ? (
          <ListScopeStrip {...scope.bannerProps}>
            {scope.isExpanded && <BulkScopeEditor {...scope.editorProps} />}
          </ListScopeStrip>
        ) : undefined
      }
      empty={
        <EmptyState
          title="No custom fields yet"
          description={
            selectedTab === 'tickets'
              ? 'Add your first custom field to extend ticket data.'
              : `Custom fields for ${selectedTab} are not yet available.`
          }
          action={
            selectedTab === 'tickets' ? (
              <BaseButton onPress={handleCreate}>
                Create Custom Field
              </BaseButton>
            ) : undefined
          }
          live
        />
      }
      modals={
        <>
          <CustomFieldEditorModal
            isOpen={isEditorModalOpen}
            onClose={handleCloseModal}
            field={editingField}
          />
          {dialog}
        </>
      }
    />
  );
}

export default CustomFieldsPage;
