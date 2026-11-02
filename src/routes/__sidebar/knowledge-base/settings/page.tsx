import type { HelpdeskDomainKnowledgeBaseEnumsKbPortalSection as KbPortalSection } from '@/api/helpdesk-client';
import {
  type HelpdeskApplicationKnowledgeBaseCommandsCreateCategoryCreateCategoryCommand,
  type HelpdeskApplicationKnowledgeBaseCommandsUpdateCategoryUpdateCategoryCommand,
  type HelpdeskDomainKnowledgeBaseEnumsKbSharing,
  type HelpdeskDomainKnowledgeBaseEnumsKbStaffSection,
  KnowledgeBaseApi,
} from '@/api/helpdesk-client';
import {
  type CategoryRow,
  buildCategoryRows,
} from '@/components/knowledge-base/categoryRows';
import { DuplicateCategoryModal } from '@/components/knowledge-base/components/DuplicateCategoryModal';
import {
  useDuplicateKbCategory,
  useKnowledgeBaseCategories,
} from '@/components/knowledge-base/hooks/useKnowledgeBase';
import {
  PORTAL_SECTION_HINT,
  PORTAL_SECTION_OPTIONS,
  portalSectionLabel,
} from '@/components/knowledge-base/portalSection';
import {
  SHARING_HINT,
  SHARING_OPTIONS,
  STAFF_SECTION_HINT,
  STAFF_SECTION_OPTIONS,
  sharingLabel,
  staffSectionLabel,
} from '@/components/knowledge-base/sharing';
import { IconTip, ModalHeader } from '@/components/shared';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type { KnowledgeBaseCategoryDto } from '@/types';
import {
  BaseInput,
  BaseModal,
  BaseModalBody,
  BaseModalContent,
  BaseModalFooter,
  BaseSelect,
  BaseSelectItem,
  BaseTable,
  TablePagination,
} from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import { BaseButton } from '@brainforgeau/components/button';
import {
  EmptyState,
  PageBody,
  PageHeader,
  useConfirm,
} from '@brainforgeau/components/page';
import { Spinner, toast } from '@heroui/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  type ColumnDef,
  type PaginationState,
  createColumnHelper,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useCallback, useMemo, useState } from 'react';

type ModalMode = 'create' | 'edit' | null;

const columnHelper = createColumnHelper<CategoryRow>();

function CategoryFormModal({
  mode,
  category,
  categories,
  onClose,
}: {
  mode: ModalMode;
  category: KnowledgeBaseCategoryDto | null;
  categories: KnowledgeBaseCategoryDto[];
  onClose: () => void;
}) {
  const [name, setName] = useState(category?.name ?? '');
  const [description, setDescription] = useState(category?.description ?? '');
  const [parentId, setParentId] = useState<string>(category?.parentId ?? '');
  const [portalSection, setPortalSection] = useState<KbPortalSection>(
    category?.portalSection ?? 'None',
  );
  const [sharing, setSharing] =
    useState<HelpdeskDomainKnowledgeBaseEnumsKbSharing>(
      category?.sharing ?? 'Internal',
    );
  const [staffSection, setStaffSection] =
    useState<HelpdeskDomainKnowledgeBaseEnumsKbStaffSection>(
      category?.staffSection ?? 'None',
    );

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async () => {
      const client = await createHelpdeskApiClient(KnowledgeBaseApi);
      const command: HelpdeskApplicationKnowledgeBaseCommandsCreateCategoryCreateCategoryCommand =
        {
          name,
          description: description || undefined,
          parentId: parentId || undefined,
          sortOrder: 0,
          sharing,
          staffSection,
          portalSection,
        };
      const response = await client.v1KbCategoriesPost(command);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['knowledge-base', 'categories'],
      });
      toast('Category created', { variant: 'success' });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!category) return;
      const client = await createHelpdeskApiClient(KnowledgeBaseApi);
      const command: HelpdeskApplicationKnowledgeBaseCommandsUpdateCategoryUpdateCategoryCommand =
        {
          id: category.id,
          name,
          description: description || undefined,
          sharing,
          staffSection,
          portalSection,
        };
      const response = await client.v1KbCategoriesIdPut(category.id, command);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['knowledge-base', 'categories'],
      });
      toast('Category updated', { variant: 'success' });
      onClose();
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = () => {
    if (!name.trim()) {
      toast('Name required', { variant: 'warning' });
      return;
    }
    if (mode === 'create') {
      createMutation.mutate();
    } else {
      updateMutation.mutate();
    }
  };

  // Filter out the current category from parent options to avoid self-reference
  const parentOptions = categories.filter(c => c.id !== category?.id);

  return (
    <BaseModal isOpen={mode !== null} onClose={onClose} size="lg">
      <BaseModalContent>
        <ModalHeader>
          {mode === 'create' ? 'Create Category' : 'Edit Category'}
        </ModalHeader>
        <BaseModalBody>
          <div className="space-y-4">
            <BaseInput
              label="Name"
              isRequired
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Category name"
            />
            <BaseInput
              label="Description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional description"
            />
            <div>
              <BaseSelect
                label="Show in customer portal"
                selectedKey={portalSection}
                onSelectionChange={key =>
                  setPortalSection(key as KbPortalSection)
                }
              >
                {PORTAL_SECTION_OPTIONS.map(option => (
                  <BaseSelectItem key={option.id} id={option.id}>
                    {option.label}
                  </BaseSelectItem>
                ))}
              </BaseSelect>
              <p className="text-default-500 mt-1 text-xs">
                {PORTAL_SECTION_HINT}
              </p>
            </div>
            {mode === 'create' && (
              <BaseSelect
                label="Parent category (optional)"
                placeholder="None (top-level)"
                selectedKey={parentId || '__none__'}
                onSelectionChange={key => {
                  setParentId(key === '__none__' ? '' : (key as string));
                }}
              >
                {[
                  <BaseSelectItem key="__none__" id="__none__">
                    None (top-level)
                  </BaseSelectItem>,
                  ...parentOptions.map(cat => (
                    <BaseSelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </BaseSelectItem>
                  )),
                ]}
              </BaseSelect>
            )}
            <BaseSelect
              label="Shared with"
              description={SHARING_HINT}
              selectedKey={sharing}
              onSelectionChange={key => {
                if (key)
                  setSharing(key as HelpdeskDomainKnowledgeBaseEnumsKbSharing);
              }}
              data-testid="kb-category-sharing"
            >
              {SHARING_OPTIONS.map(option => (
                <BaseSelectItem key={option.id} id={option.id}>
                  {option.label}
                </BaseSelectItem>
              ))}
            </BaseSelect>
            <BaseSelect
              label="Staff section"
              description={STAFF_SECTION_HINT}
              selectedKey={staffSection}
              onSelectionChange={key => {
                if (key)
                  setStaffSection(
                    key as HelpdeskDomainKnowledgeBaseEnumsKbStaffSection,
                  );
              }}
              data-testid="kb-category-staff-section"
            >
              {STAFF_SECTION_OPTIONS.map(option => (
                <BaseSelectItem key={option.id} id={option.id}>
                  {option.label}
                </BaseSelectItem>
              ))}
            </BaseSelect>
          </div>
        </BaseModalBody>
        <BaseModalFooter>
          <BaseButton variant="bordered" color="light" onPress={onClose}>
            Cancel
          </BaseButton>
          <BaseButton
            color="primary"
            onPress={handleSubmit}
            isDisabled={isPending}
          >
            {mode === 'create' ? 'Create' : 'Save'}
          </BaseButton>
        </BaseModalFooter>
      </BaseModalContent>
    </BaseModal>
  );
}

function KbCategoriesPage() {
  const { data: categories = [], isLoading } = useKnowledgeBaseCategories();
  const [search, setSearch] = useState('');
  const [formMode, setFormMode] = useState<ModalMode>(null);
  const [editingCategory, setEditingCategory] =
    useState<KnowledgeBaseCategoryDto | null>(null);
  const [duplicatingCategory, setDuplicatingCategory] =
    useState<KnowledgeBaseCategoryDto | null>(null);

  const { confirm, dialog } = useConfirm();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      const client = await createHelpdeskApiClient(KnowledgeBaseApi);
      await client.v1KbCategoriesIdDelete(categoryId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['knowledge-base', 'categories'],
      });
      toast('Category deleted', { variant: 'success' });
    },
    onError: () => {
      toast('Cannot delete category', {
        description: 'Categories with articles cannot be deleted.',
        variant: 'danger',
      });
    },
  });

  const rows = useMemo(
    () => buildCategoryRows(categories, search),
    [categories, search],
  );

  const openCreate = () => {
    setEditingCategory(null);
    setFormMode('create');
  };

  const openEdit = useCallback((cat: KnowledgeBaseCategoryDto) => {
    setEditingCategory(cat);
    setFormMode('edit');
  }, []);

  const closeForm = () => {
    setFormMode(null);
    setEditingCategory(null);
  };

  const deleteCategory = deleteMutation.mutate;
  const handleDeleteRequest = useCallback(
    async (cat: KnowledgeBaseCategoryDto) => {
      const ok = await confirm({
        title: 'Delete Category',
        body: `Are you sure you want to delete "${cat.name}"? This action cannot be undone. Categories containing articles cannot be deleted.`,
        confirmLabel: 'Delete',
        destructive: true,
      });
      if (!ok) return;
      deleteCategory(cat.id);
    },
    [confirm, deleteCategory],
  );

  const columns = useMemo(
    (): ColumnDef<CategoryRow, unknown>[] => [
      columnHelper.display({
        id: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <div
            className="flex items-center gap-2"
            style={{ paddingLeft: `${row.original.depth * 1.5}rem` }}
          >
            {row.original.depth > 0 && (
              <span className="bg-default-300 h-px w-4 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {row.original.name}
              </p>
              {row.original.description && (
                <p className="text-default-500 truncate text-xs">
                  {row.original.description}
                </p>
              )}
            </div>
          </div>
        ),
        size: 380,
      }),
      columnHelper.display({
        id: 'articles',
        header: 'Articles',
        cell: ({ row }) => (
          <span className="text-default-600 text-sm">
            {row.original.articleCount ?? 0}
          </span>
        ),
        size: 100,
      }),
      columnHelper.display({
        id: 'sharing',
        header: 'Shared with',
        cell: ({ row }) => (
          <span className="text-default-600 text-sm">
            {sharingLabel(row.original.sharing)}
          </span>
        ),
        size: 200,
      }),
      columnHelper.display({
        id: 'staffSection',
        header: 'Staff section',
        cell: ({ row }) => (
          <span className="text-default-600 text-sm">
            {staffSectionLabel(row.original.staffSection)}
          </span>
        ),
        size: 160,
      }),
      columnHelper.display({
        id: 'portalSection',
        header: 'Portal section',
        cell: ({ row }) => (
          <span className="text-default-600 text-sm">
            {row.original.portalSection && row.original.portalSection !== 'None'
              ? portalSectionLabel(row.original.portalSection)
              : '—'}
          </span>
        ),
        size: 160,
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="-my-1.5 flex items-center justify-end gap-1">
            <IconTip label="Edit category">
              <BaseButton
                variant="link"
                size="none"
                className="text-dark dark:text-light hover:text-blue"
                aria-label="Edit category"
                onPress={() => openEdit(row.original)}
                icon={<Icon name="pencil" className="h-4 w-4" />}
              />
            </IconTip>
            <IconTip label="Duplicate category">
              <BaseButton
                variant="link"
                size="none"
                className="text-dark dark:text-light hover:text-blue"
                aria-label="Duplicate category"
                onPress={() => setDuplicatingCategory(row.original)}
                icon={<Icon name="copy" className="h-4 w-4" />}
              />
            </IconTip>
            <IconTip label="Delete category">
              <BaseButton
                variant="link"
                size="none"
                className="text-danger hover:text-danger-600"
                aria-label="Delete category"
                onPress={() => handleDeleteRequest(row.original)}
                icon={<Icon name="trash" className="h-4 w-4" />}
              />
            </IconTip>
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
        size: 120,
      }),
    ],
    [openEdit, handleDeleteRequest],
  );

  // Client side paging: the categories endpoint returns the whole tree in one
  // call, so paging only limits what reaches the DOM.
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const table = useReactTable<CategoryRow>({
    data: rows,
    columns,
    getRowId: row => row.id,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: { pagination },
    onPaginationChange: setPagination,
    enableSorting: false,
  });
  // A search can shrink the result set below the current page; snap back.
  if (
    pagination.pageIndex > 0 &&
    pagination.pageIndex >= table.getPageCount()
  ) {
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  }

  return (
    <PageBody>
      <PageHeader
        title="Manage Categories"
        breadcrumbsKey="knowledge-base.settings"
        helpKey="helpdesk.knowledge-base.settings"
      >
        <PageHeader.Meta>
          Create, edit, delete and organise KB categories
        </PageHeader.Meta>
        <PageHeader.Actions>
          <BaseButton
            color="primary"
            icon={<Icon name="plus" className="h-4 w-4" />}
            onPress={openCreate}
          >
            New Category
          </BaseButton>
        </PageHeader.Actions>
      </PageHeader>

      <div className="mb-4 max-w-md">
        <BaseInput
          placeholder="Search categories..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          startContent={
            <Icon
              name="magnifying-glass"
              className="text-default-400 h-4 w-4"
            />
          }
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title={
            search ? 'No categories match your search' : 'No categories yet'
          }
          description={
            search
              ? 'Try a different search term or clear the filter.'
              : 'Create the first category to start organising articles.'
          }
          live
        />
      ) : (
        <BaseTable
          table={table}
          showInfo={false}
          paginationTemplate={() => (
            <TablePagination
              totalPages={Math.max(1, table.getPageCount())}
              currentPage={pagination.pageIndex + 1}
              onPageChange={page =>
                setPagination(prev => ({ ...prev, pageIndex: page - 1 }))
              }
            />
          )}
        />
      )}

      {/* Keyed so the form starts from the category being edited: its fields
          are initialised once, and a stale Sharing would be saved back. */}
      <CategoryFormModal
        key={`${formMode ?? 'closed'}-${editingCategory?.id ?? 'new'}`}
        mode={formMode}
        category={editingCategory}
        categories={categories}
        onClose={closeForm}
      />

      <DuplicateCategoryModal
        isOpen={!!duplicatingCategory}
        category={duplicatingCategory}
        onClose={() => setDuplicatingCategory(null)}
      />

      {dialog}
    </PageBody>
  );
}

export default KbCategoriesPage;
