/**
 * Rule graphs list page for a given automation project.
 *
 * Accessed at /configuration/automations/:projectId
 * Lists all rule graphs for the project with create and delete actions.
 * Clicking a row navigates to the graph editor.
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
import { Chip, toast } from '@heroui/react';
import { NavLink, useNavigate, useParams } from '@modern-js/runtime/router';
import type { ColumnDef, PaginationState } from '@tanstack/react-table';
import { getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { useCallback, useMemo, useState } from 'react';
import type { RuleGraphDto } from '@brainforgeau/rules-ui';
import {
  useRuleGraphs,
  useCreateRuleGraph,
  useDeleteRuleGraph,
} from '../state/ruleProjectQueries';
import { ConfirmActionModal } from '@/workflow-editor/components/ConfirmActionModal';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function publishedBadge(isPublished: boolean) {
  return isPublished ? (
    <Chip size="sm" color="success">
      Published
    </Chip>
  ) : (
    <Chip size="sm" color="warning">
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

// REVIEW: Using controlled component pattern for create modal.
export function RuleGraphsListPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: graphs, isLoading } = useRuleGraphs(projectId ?? null);
  const createMutation = useCreateRuleGraph();
  const deleteMutation = useDeleteRuleGraph();
  const navigate = useNavigate();
  const logger = useLogger('RuleGraphsListPage');

  const [newName, setNewName] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });

  const filteredData = useMemo(() => {
    const all = graphs ?? [];
    if (!searchTerm.trim()) return all;
    const lower = searchTerm.toLowerCase();
    return all.filter(
      g =>
        g.name.toLowerCase().includes(lower) ||
        g.key.toLowerCase().includes(lower) ||
        (g.description ?? '').toLowerCase().includes(lower),
    );
  }, [graphs, searchTerm]);

  async function handleCreate() {
    if (!projectId) return;
    const name = newName.trim() || 'Untitled Graph';
    const key = toSlug(name);
    try {
      const result = await createMutation.mutateAsync({
        projectId,
        name,
        key,
      });
      setNewName('');
      setIsCreateOpen(false);
      navigate(`/configuration/automations/${projectId}/rules/${result.id}`);
    } catch (err) {
      logger.captureError(
        err instanceof Error ? err : new Error(String(err)),
        { context: 'rule_graphs_list_create_failed' },
      );
      toast('Failed to create rule graph', { variant: 'danger' });
    }
  }

  async function handleDeleteConfirm() {
    if (!pendingDeleteId || !projectId) return;
    try {
      await deleteMutation.mutateAsync({ projectId, ruleId: pendingDeleteId });
      toast('Rule graph deleted', { variant: 'success' });
    } catch (err) {
      logger.captureError(
        err instanceof Error ? err : new Error(String(err)),
        { context: 'rule_graphs_list_delete_failed' },
      );
      toast('Delete failed', { description: err instanceof Error ? err.message : 'Unknown error', variant: 'danger' });
    } finally {
      setPendingDeleteId(null);
    }
  }

  const columns = useMemo<ColumnDef<RuleGraphDto>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <NavLink
            to={`/configuration/automations/${projectId}/rules/${row.original.id}`}
            className="font-medium text-primary hover:underline"
          >
            {row.original.name}
          </NavLink>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => publishedBadge(row.original.isPublished),
      },
      {
        id: 'modifiedAt',
        header: 'Last modified',
        cell: ({ row }) => formatDate(row.original.modifiedAt),
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
              aria-label="Delete rule graph"
              onPress={() => setPendingDeleteId(row.original.id)}
              icon={<Icon name="trash" className="h-4 w-4" />}
            />
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [projectId],
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

  const pendingDelete = graphs?.find(g => g.id === pendingDeleteId);

  return (
    <>
      <div className="mb-5">
        <div className="mb-5 flex items-start gap-5 lg:flex">
          <div>
            <nav className="mb-1 flex items-center gap-1.5 text-xs text-default-500">
              <NavLink
                to="/configuration/automations"
                className="text-default-500 no-underline hover:text-default-700"
              >
                Automations
              </NavLink>
              <span>/</span>
              <span>Rule Graphs</span>
            </nav>
            <h1 className="text-gray text-2xl font-semibold dark:text-white">
              Rule Graphs
            </h1>
          </div>
          <div className="flex shrink-0 justify-end gap-2.5 md:ml-auto">
            <BaseButton
              icon={<Icon name="plus" className="h-3.5 w-3.5" />}
              onPress={() => setIsCreateOpen(true)}
            >
              New Rule Graph
            </BaseButton>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3">
          <div className="flex w-full flex-wrap items-end gap-2.5">
            <div className="min-w-60 flex-1">
              <BaseInput
                aria-label="Search rule graphs"
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
              <BaseModalHeader>New Rule Graph</BaseModalHeader>
              <BaseModalBody>
                <BaseInput
                  label="Graph Name"
                  value={newName}
                  onValueChange={setNewName}
                  placeholder="e.g. Auto-assign urgent tickets"
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

                  isDisabled={createMutation.isPending || !newName.trim()}
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
        title="Delete rule graph?"
        description={
          <>
            Are you sure you want to delete{' '}
            <strong>{pendingDelete?.name ?? 'this rule graph'}</strong>? This
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
