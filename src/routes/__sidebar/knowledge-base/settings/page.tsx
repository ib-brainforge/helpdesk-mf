import { DuplicateCategoryModal } from '@/components/knowledge-base/components/DuplicateCategoryModal';
import {
  useDuplicateKbCategory,
  useKnowledgeBaseCategories,
} from '@/components/knowledge-base/hooks/useKnowledgeBase';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type { KnowledgeBaseCategoryDto } from '@/types';
import { BaseInput } from '@brainforgeau/components';
import {
  BaseModal,
  BaseModalBody,
  BaseModalContent,
  BaseModalFooter,
  BaseModalHeader,
  BaseSelect,
  BaseSelectItem,
} from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import { BaseButton } from '@brainforgeau/components/button';
import {
  PageBody,
  PageHeader,
  useConfirm,
} from '@brainforgeau/components/page';
import { KnowledgeBaseApi } from '@brainforgeau/helpdesk-client';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownTrigger,
  Spinner,
  toast,
} from '@heroui/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

type ModalMode = 'create' | 'edit' | null;

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

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async () => {
      const client = await createHelpdeskApiClient(KnowledgeBaseApi);
      const response = await client.v1KbCategoriesPost({
        name,
        description: description || undefined,
        parentId: parentId || undefined,
        sortOrder: 0,
      } as any);
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
      const response = await client.v1KbCategoriesIdPut(category.id, {
        id: category.id,
        name,
        description: description || undefined,
      } as any);
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
  const parentOptions = categories.filter((c) => c.id !== category?.id);

  return (
    <BaseModal isOpen={mode !== null} onClose={onClose} size="lg">
      <BaseModalContent>
        <BaseModalHeader>
          <h2 className="text-xl font-semibold">
            {mode === 'create' ? 'Create Category' : 'Edit Category'}
          </h2>
        </BaseModalHeader>
        <BaseModalBody>
          <div className="space-y-4">
            <BaseInput
              label="Name"
              isRequired
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Category name"
            />
            <BaseInput
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
            />
            {mode === 'create' && (
              <BaseSelect
                label="Parent category (optional)"
                placeholder="None (top-level)"
                selectedKey={parentId || '__none__'}
                onSelectionChange={(key) => {
                  setParentId(key === '__none__' ? '' : (key as string));
                }}
              >
                {[
                  <BaseSelectItem key="__none__" id="__none__">
                    None (top-level)
                  </BaseSelectItem>,
                  ...parentOptions.map((cat) => (
                    <BaseSelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </BaseSelectItem>
                  )),
                ]}
              </BaseSelect>
            )}
          </div>
        </BaseModalBody>
        <BaseModalFooter>
          <BaseButton variant="bordered" onPress={onClose}>
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

  const allCategories = categories as unknown as KnowledgeBaseCategoryDto[];

  const filtered = allCategories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditingCategory(null);
    setFormMode('create');
  };

  const openEdit = (cat: KnowledgeBaseCategoryDto) => {
    setEditingCategory(cat);
    setFormMode('edit');
  };

  const closeForm = () => {
    setFormMode(null);
    setEditingCategory(null);
  };

  const handleDeleteRequest = async (cat: KnowledgeBaseCategoryDto) => {
    const ok = await confirm({
      title: 'Delete Category',
      body: `Are you sure you want to delete "${cat.name}"? This action cannot be undone. Categories containing articles cannot be deleted.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    deleteMutation.mutate(cat.id);
  };

  return (
    <PageBody>
      <PageHeader
        title="Manage Categories"
        breadcrumbsKey="knowledge-base.settings"
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
          onChange={(e) => setSearch(e.target.value)}
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
      ) : filtered.length === 0 ? (
        <div className="text-default-500 py-12 text-center">
          {search
            ? 'No categories match your search.'
            : 'No categories yet. Create the first one!'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((cat) => (
            <div
              key={cat.id}
              className="border-light bg-default-50 hover:bg-default-100 flex items-center justify-between rounded-lg border p-4 transition-colors"
            >
              <div className="flex items-center gap-3">
                {cat.parentId && (
                  <span className="bg-default-300 ml-4 h-px w-4" />
                )}
                <div>
                  <p className="font-medium">{cat.name}</p>
                  {cat.description && (
                    <p className="text-default-500 mt-0.5 text-xs">
                      {cat.description}
                    </p>
                  )}
                  <p className="text-default-400 mt-0.5 text-xs">
                    {cat.articleCount ?? 0} article
                    {(cat.articleCount ?? 0) !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <Dropdown>
                <DropdownTrigger>
                  <BaseButton variant="bordered" isIconOnly size="sm">
                    <Icon name="dotsV" className="h-4 w-4" />
                  </BaseButton>
                </DropdownTrigger>
                <DropdownPopover>
                  <DropdownMenu aria-label="Category actions">
                    <DropdownItem key="edit" onPress={() => openEdit(cat)}>
                      Edit
                    </DropdownItem>
                    <DropdownItem
                      key="duplicate"
                      onPress={() => setDuplicatingCategory(cat)}
                    >
                      Duplicate
                    </DropdownItem>
                    <DropdownItem
                      key="delete"
                      className="text-danger"
                      onPress={() => handleDeleteRequest(cat)}
                    >
                      Delete
                    </DropdownItem>
                  </DropdownMenu>
                </DropdownPopover>
              </Dropdown>
            </div>
          ))}
        </div>
      )}

      <CategoryFormModal
        mode={formMode}
        category={editingCategory}
        categories={allCategories}
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
