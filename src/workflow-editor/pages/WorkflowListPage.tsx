import {
  BaseButton,
  BaseInput,
  BaseModal,
  BaseModalBody,
  BaseModalContent,
  BaseModalFooter,
  BaseModalHeader,
  BaseTable,
  Icon,
  TablePagination,
} from '@brainforgeau/components';
import { addToast } from '@heroui/react';
import { NavLink, useNavigate } from '@modern-js/runtime/router';
import type { ColumnDef, PaginationState } from '@tanstack/react-table';
import { getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { useCallback, useMemo, useState } from 'react';
import { BulkCloneModal } from '../components/BulkCloneModal';
import { ConfirmActionModal } from '../components/ConfirmActionModal';
import { ScopeBadge } from '../components/ScopeBadge';
import { VersionBadge } from '../components/VersionBadge';
import {
  useCreateDefinition,
  useDeleteDefinition,
  useWorkflowList,
} from '../state/workflowQueries';
import type { WorkflowDefinitionDto } from '../types/workflow';
import { isTenantOwned } from '../types/workflow';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function WorkflowListPage() {
  const { data, isLoading } = useWorkflowList();
  const createMutation = useCreateDefinition();
  const deleteMutation = useDeleteDefinition();
  const navigate = useNavigate();

  const [newName, setNewName] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [cloneTarget, setCloneTarget] = useState<WorkflowDefinitionDto | null>(
    null,
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });

  const filteredData = useMemo(() => {
    const all = data ?? [];
    if (!searchTerm.trim()) return all;
    const lower = searchTerm.toLowerCase();
    return all.filter(d => d.name.toLowerCase().includes(lower));
  }, [data, searchTerm]);

  async function handleCreate() {
    const name = newName.trim() || 'Untitled workflow';
    try {
      const result = await createMutation.mutateAsync({ name });
      setNewName('');
      setIsCreateOpen(false);
      navigate(`/configuration/workflows/${result.id}`);
    } catch {
      addToast({ title: 'Failed to create workflow', severity: 'danger' });
    }
  }

  async function handleDeleteConfirm() {
    if (!pendingDeleteId) return;
    try {
      await deleteMutation.mutateAsync(pendingDeleteId);
      addToast({ title: 'Workflow deleted', severity: 'success' });
    } catch (err) {
      addToast({
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        severity: 'danger',
      });
    } finally {
      setPendingDeleteId(null);
    }
  }

  const columns = useMemo<ColumnDef<WorkflowDefinitionDto>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <NavLink
            to={`/configuration/workflows/${row.original.id}`}
            className="font-medium text-primary hover:underline"
          >
            {row.original.name}
          </NavLink>
        ),
      },
      {
        id: 'type',
        header: 'Scope',
        cell: ({ row }) => <ScopeBadge ownerScope={row.original.ownerScope} />,
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) =>
          row.original.latestVersion ? (
            <VersionBadge status={row.original.latestVersion.status} />
          ) : row.original.draftVersion ? (
            <VersionBadge status={row.original.draftVersion.status} />
          ) : (
            <span className="text-xs text-default-400">No version</span>
          ),
      },
      {
        id: 'lastPublished',
        header: 'Last published',
        cell: ({ row }) =>
          row.original.latestVersion?.publishedAt
            ? formatDate(row.original.latestVersion.publishedAt)
            : '—',
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <BaseButton
              size="sm"
              isIconOnly
              variant="light"
              aria-label="Clone workflow"
              onPress={() => setCloneTarget(row.original)}
              icon={<Icon name="copy" className="h-4 w-4" />}
            />
            <BaseButton
              size="sm"
              isIconOnly
              variant="light"
              color="danger"
              aria-label="Delete workflow"
              onPress={() => setPendingDeleteId(row.original.id)}
              isDisabled={!isTenantOwned(row.original)}
              icon={<Icon name="trash" className="h-4 w-4" />}
            />
          </div>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: false,
    pageCount: Math.max(
      1,
      Math.ceil(filteredData.length / pagination.pageSize),
    ),
  });

  const paginationTemplate = useCallback(() => {
    const totalPages = Math.max(
      1,
      Math.ceil(filteredData.length / pagination.pageSize),
    );
    return (
      <TablePagination
        totalPages={totalPages}
        currentPage={pagination.pageIndex + 1}
        onPageChange={(page: number) =>
          setPagination(prev => ({ ...prev, pageIndex: page - 1 }))
        }
      />
    );
  }, [filteredData.length, pagination]);

  const pendingDelete = data?.find(d => d.id === pendingDeleteId);

  return (
    <>
      <div className="mb-5">
        <div className="mb-5 flex items-start gap-5 lg:flex">
          <h1 className="text-gray mb-2 text-2xl font-semibold md:mb-0 dark:text-white">
            Workflows
          </h1>
          <div className="flex shrink-0 justify-end gap-2.5 md:ml-auto">
            <BaseButton
              icon={<Icon name="plus" className="h-3.5 w-3.5" />}
              onPress={() => setIsCreateOpen(true)}
            >
              New Workflow
            </BaseButton>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3">
          <div className="flex w-full flex-wrap items-end gap-2.5">
            <div className="min-w-60 flex-1">
              <BaseInput
                aria-label="Search workflows"
                startContent={
                  <Icon name="search" className="-ml-0.5 h-4.5 w-4.5" />
                }
                placeholder="Search by name"
                value={searchTerm}
                onValueChange={setSearchTerm}
              />
            </div>
            <div className="flex gap-2">
              <BaseButton
                variant="bordered"
                color="light"
                aria-label="Clear filters"
                onClick={() => setSearchTerm('')}
              >
                CLEAR
              </BaseButton>
            </div>
          </div>
        </div>
      </div>

      <BaseTable
        fullHeight
        table={table}
        showInfo={false}
        paginationTemplate={paginationTemplate}
        isLoading={isLoading}
        loading={{ title: 'Loading...' }}
      />

      {/* Create modal */}
      <BaseModal
        isOpen={isCreateOpen}
        onOpenChange={open => setIsCreateOpen(open)}
        size="md"
      >
        <BaseModalContent>
          {onClose => (
            <>
              <BaseModalHeader>New Workflow</BaseModalHeader>
              <BaseModalBody>
                <BaseInput
                  label="Workflow Name"
                  value={newName}
                  onValueChange={setNewName}
                  placeholder="e.g. Standard Helpdesk"
                  labelPlacement="outside"
                  isRequired
                />
              </BaseModalBody>
              <BaseModalFooter>
                <BaseButton variant="light" onPress={onClose}>
                  Cancel
                </BaseButton>
                <BaseButton
                  color="primary"
                  isLoading={createMutation.isPending}
                  isDisabled={!newName.trim()}
                  onPress={handleCreate}
                >
                  Create
                </BaseButton>
              </BaseModalFooter>
            </>
          )}
        </BaseModalContent>
      </BaseModal>

      {/* Clone modal */}
      {cloneTarget && (
        <BulkCloneModal
          isOpen={!!cloneTarget}
          onOpenChange={open => !open && setCloneTarget(null)}
          sourceDefinitionId={cloneTarget.id}
          sourceDefinitionName={cloneTarget.name}
          getDetailUrl={newId => `/configuration/workflows/${newId}`}
        />
      )}

      {/* Delete confirm */}
      <ConfirmActionModal
        isOpen={pendingDeleteId !== null}
        onOpenChange={open => !open && setPendingDeleteId(null)}
        title="Delete workflow?"
        description={
          <>
            Are you sure you want to delete{' '}
            <strong>{pendingDelete?.name ?? 'this workflow'}</strong>? This
            action cannot be undone.
          </>
        }
        confirmLabel="Delete"
        destructive
        isLoading={deleteMutation.isPending}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
