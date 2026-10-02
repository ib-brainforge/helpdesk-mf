import { BaseInput } from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import { BaseButton } from '@brainforgeau/components/button';
import {
  CategoryEditorModal,
  SectionEditorModal,
  useCategoriesData,
  useCategoryTable,
  usePresetCategories,
} from '@components/categories';

import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type { CategoryDto, SectionDto } from '@/types/category';
import {
  EmptyState,
  ListPage,
  useConfirm,
} from '@brainforgeau/components/page';
import { CategoriesApi } from '@brainforgeau/helpdesk-client';
import { toast } from '@heroui/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

function CategoriesPage() {
  const queryClient = useQueryClient();
  const { categories, sections, isLoading } = useCategoriesData();

  /*
   * The Netcorp presets are listed alongside the tenant's own categories. They
   * are what the request form offers, so leaving them out of Configuration
   * would make the screen contradict the form. They are marked and made read
   * only rather than hidden, because "you may use this but not change it" is
   * the true state and hiding it just raises the question elsewhere.
   */
  const {
    presets,
    presetIds,
    isLoading: isLoadingPresets,
  } = usePresetCategories(categories.map(c => c.id));

  const allCategories = useMemo(
    () => [...categories, ...presets],
    [categories, presets],
  );
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<
    CategoryDto | undefined
  >(undefined);
  const [editingSection, setEditingSection] = useState<SectionDto | undefined>(
    undefined,
  );
  const [searchTerm, setSearchTerm] = useState('');
  const { confirm, dialog } = useConfirm();

  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      const client = await createHelpdeskApiClient(CategoriesApi);
      await client.v1CategoriesIdDelete(categoryId);
    },
    onSuccess: () => {
      toast('Category deleted successfully', { variant: 'success' });
      // Invalidate both queries: a deleted category may have been unsectioned,
      // and the section's category count should also reflect the change.
      queryClient.invalidateQueries({ queryKey: ['helpdesk-categories'] });
      queryClient.invalidateQueries({ queryKey: ['helpdesk-sections'] });
    },
    onError: () => {
      // Error handled by global axios interceptor
    },
  });

  const deleteSectionMutation = useMutation({
    mutationFn: async (sectionId: string) => {
      const client = await createHelpdeskApiClient(CategoriesApi);
      await client.v1CategoriesSectionsIdDelete(sectionId);
    },
    onSuccess: () => {
      toast('Section deleted successfully', { variant: 'success' });
      // Deleting a section may move its categories to unsectioned — invalidate both.
      queryClient.invalidateQueries({ queryKey: ['helpdesk-categories'] });
      queryClient.invalidateQueries({ queryKey: ['helpdesk-sections'] });
    },
    onError: () => {
      // Error handled by global axios interceptor
    },
  });

  const handleEditCategory = (category: CategoryDto) => {
    setEditingCategory(category);
    setIsCategoryModalOpen(true);
  };

  const handleEditSection = (section: SectionDto) => {
    setEditingSection(section);
    setIsSectionModalOpen(true);
  };

  const handleCreateCategory = () => {
    setEditingCategory(undefined);
    setIsCategoryModalOpen(true);
  };

  const handleCreateSection = () => {
    setEditingSection(undefined);
    setIsSectionModalOpen(true);
  };

  const handleCloseCategoryModal = () => {
    setIsCategoryModalOpen(false);
    setEditingCategory(undefined);
  };

  const handleCloseSectionModal = () => {
    setIsSectionModalOpen(false);
    setEditingSection(undefined);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId);
    const ok = await confirm({
      title: 'Delete category?',
      body: `Delete "${cat?.name ?? 'this category'}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (ok) deleteCategoryMutation.mutate(categoryId);
  };

  const { table } = useCategoryTable({
    categories: allCategories,
    sections,
    searchTerm,
    isLoading: isLoading || isLoadingPresets,
    onEditCategory: handleEditCategory,
    onDeleteCategory: handleDeleteCategory,
    presetIds,
  });

  return (
    <ListPage
      title="Ticket Categories and Permissions"
      breadcrumbsKey="configuration.categories.list"
      table={table}
      isLoading={isLoading}
      actions={
        <div className="flex gap-2.5">
          <BaseButton
            icon={<Icon name="plus" className="h-3.5 w-3.5" />}
            onPress={handleCreateSection}
            variant="bordered"
          >
            Add Section
          </BaseButton>
          <BaseButton
            color="primary"
            icon={<Icon name="plus" className="h-3.5 w-3.5" />}
            onPress={handleCreateCategory}
          >
            Add New Category
          </BaseButton>
        </div>
      }
      filters={
        <BaseInput
          placeholder="Search categories..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          startContent={
            <Icon
              name="magnifying-glass"
              className="h-4 w-4 text-default-400"
            />
          }
          className="max-w-md"
        />
      }
      hasActiveFilters={searchTerm.length > 0}
      onClearFilters={() => setSearchTerm('')}
      empty={
        <EmptyState
          title={
            searchTerm ? 'No categories match your search' : 'No categories yet'
          }
          description={
            searchTerm
              ? 'Try a different search term or clear the filter.'
              : 'Add your first category to start organizing tickets.'
          }
          action={
            !searchTerm ? (
              <BaseButton color="primary" onPress={handleCreateCategory}>
                Add First Category
              </BaseButton>
            ) : undefined
          }
          live
        />
      }
      modals={
        <>
          <CategoryEditorModal
            isOpen={isCategoryModalOpen}
            onClose={handleCloseCategoryModal}
            category={editingCategory}
            sections={sections}
          />
          <SectionEditorModal
            isOpen={isSectionModalOpen}
            onClose={handleCloseSectionModal}
            section={editingSection}
          />
          {dialog}
        </>
      }
    />
  );
}

export default CategoriesPage;
