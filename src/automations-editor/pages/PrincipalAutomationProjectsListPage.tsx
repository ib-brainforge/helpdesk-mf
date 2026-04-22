/**
 * Principal-scoped automation rule-projects list page.
 *
 * Mirrors PrincipalWorkflowListPage pattern — uses principalId from route params,
 * same columns and interactions as the tenant-scoped list page.
 *
 * REVIEW: Principal automations share the same backend rule-projects API;
 * the principalId is passed as a context header via the context token.
 */
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
import { useLogger } from '@brainforgeau/observability';
import { Chip, Switch, addToast } from '@heroui/react';
import { NavLink, useNavigate, useParams } from '@modern-js/runtime/router';
import type { ColumnDef, PaginationState } from '@tanstack/react-table';
import { getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { useCallback, useMemo, useState } from 'react';
import type { RuleProjectDto } from '@brainforgeau/rules-ui';
import {
  useRuleProjects,
  useCreateRuleProject,
  useDeleteRuleProject,
  useUpdateRuleProject,
} from '../state/ruleProjectQueries';
import { ConfirmActionModal } from '@/workflow-editor/components/ConfirmActionModal';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function statusBadge(status: string) {
  if (status === 'Active') {
    return (
      <Chip size="sm" color="success" variant="flat">
        Active
      </Chip>
    );
  }
  if (status === 'Archived') {
    return (
      <Chip size="sm" color="default" variant="flat">
        Archived
      </Chip>
    );
  }
  return (
    <Chip size="sm" color="warning" variant="flat">
      Draft
    </Chip>
  );
}

function toSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// REVIEW: Principal scope reuses the same rule-projects endpoint — context token
// carries the principal context. No additional principalId query param needed.
export function PrincipalAutomationProjectsListPage() {
  const { principalId } = useParams<{ principalId: string }>();
  const { data, isLoading } = useRuleProjects();
  const createMutation = useCreateRuleProject();
  const deleteMutation = useDeleteRuleProject();
  const updateMutation = useUpdateRuleProject();
  const navigate = useNavigate();
  const logger = useLogger('PrincipalAutomationProjectsListPage');

  const [newName, setNewName] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });

  const filteredData = useMemo(() => {
    const all = data ?? [];
    if (!searchTerm.trim()) return all;
    const lower = searchTerm.toLowerCase();
    return all.filter(
      d =>
        d.name.toLowerCase().includes(lower) ||
        d.key.toLowerCase().includes(lower) ||
        (d.description ?? '').toLowerCase().includes(lower),
    );
  }, [data, searchTerm]);

  async function handleCreate() {
    if (!principalId) return;
    const name = newName.trim() || 'Untitled Automation';
    const key = toSlug(name);
    try {
      const result = await createMutation.mutateAsync({ name, key });
      setNewName('');
      setIsCreateOpen(false);
      navigate(`/principal/${principalId}/automations/${result.id}`);
    } catch (err) {
      logger.captureError(
        err instanceof Error ? err : new Error(String(err)),
        { context: 'principal_automation_list_create_failed' },
      );
      addToast({ title: 'Failed to create automation project', severity: 'danger' });
    }
  }

  async function handleDeleteConfirm() {
    if (!pendingDeleteId) return;
    try {
      await deleteMutation.mutateAsync(pendingDeleteId);
      addToast({ title: 'Automation project deleted', severity: 'success' });
    } catch (err) {
      logger.captureError(
        err instanceof Error ? err : new Error(String(err)),
        { context: 'principal_automation_list_delete_failed' },
      );
      addToast({
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        severity: 'danger',
      });
    } finally {
      setPendingDeleteId(null);
    }
  }

  async function handleToggleEnabled(project: RuleProjectDto) {
    try {
      await updateMutation.mutateAsync({
        id: project.id,
        payload: {
          name: project.name,
          description: project.description,
          isEnabled: !project.isEnabled,
          status: project.status,
        },
      });
    } catch {
      addToast({ title: 'Failed to update project', severity: 'danger' });
    }
  }

  const columns = useMemo<ColumnDef<RuleProjectDto>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <NavLink
            to={`/principal/${principalId}/automations/${row.original.id}`}
            className="font-medium text-primary hover:underline"
          >
            {row.original.name}
          </NavLink>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => statusBadge(row.original.status),
      },
      {
        id: 'modifiedAt',
        header: 'Last modified',
        cell: ({ row }) =>
          row.original.modifiedAt
            ? formatDate(row.original.modifiedAt)
            : formatDate(row.original.createdAt),
      },
      {
        id: 'enabled',
        header: 'Enabled',
        cell: ({ row }) => (
          <Switch
            aria-label={`Toggle ${row.original.name}`}
            isSelected={row.original.isEnabled}
            onValueChange={() => handleToggleEnabled(row.original)}
            size="sm"
          />
        ),
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
              color="danger"
              aria-label="Delete automation project"
              onPress={() => setPendingDeleteId(row.original.id)}
              icon={<Icon name="trash" className="h-4 w-4" />}
            />
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [principalId],
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
            Automations
          </h1>
          <div className="flex shrink-0 justify-end gap-2.5 md:ml-auto">
            <BaseButton
              icon={<Icon name="plus" className="h-3.5 w-3.5" />}
              onPress={() => setIsCreateOpen(true)}
            >
              New Automation
            </BaseButton>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3">
          <div className="flex w-full flex-wrap items-end gap-2.5">
            <div className="min-w-60 flex-1">
              <BaseInput
                aria-label="Search automations"
                startContent={
                  <Icon name="search" className="-ml-0.5 h-4.5 w-4.5" />
                }
                placeholder="Search by name or key"
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
              <BaseModalHeader>New Automation Project</BaseModalHeader>
              <BaseModalBody>
                <BaseInput
                  label="Automation Name"
                  value={newName}
                  onValueChange={setNewName}
                  placeholder="e.g. Ticket Assignment Rules"
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

      {/* Delete confirm */}
      <ConfirmActionModal
        isOpen={pendingDeleteId !== null}
        onOpenChange={open => !open && setPendingDeleteId(null)}
        title="Delete automation project?"
        description={
          <>
            Are you sure you want to delete{' '}
            <strong>{pendingDelete?.name ?? 'this automation project'}</strong>?
            This action cannot be undone.
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
