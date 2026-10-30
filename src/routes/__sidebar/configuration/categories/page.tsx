import { BaseInput } from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import { BaseButton } from '@brainforgeau/components/button';
import {
  CategoryEditorModal,
  NO_SECTION,
  SectionEditorModal,
  SectionsPanel,
  useCategoriesData,
  useCategoryTable,
  useSetPortalEnquiryCategory,
} from '@components/categories';

import { CategoriesApi } from '@/api/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type { CategoryDto, SectionDto } from '@/types/category';
import {
  extractErrorMessage,
  isConflictError,
  isServerError,
} from '@/utils/error-handling';
import {
  EmptyState,
  ListPage,
  useConfirm,
} from '@brainforgeau/components/page';
import { toast } from '@heroui/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

function CategoriesPage() {
  const queryClient = useQueryClient();
  const { categories, sections, isLoading } = useCategoriesData({
    withSections: true,
  });

  // Which section the table shows: null for every category, NO_SECTION for
  // those in none, or a section id. Chosen in the Sections panel.
  const [sectionFilter, setSectionFilter] = useState<string | null>(null);
  const countsBySection = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of categories) {
      if (c.sectionId)
        counts.set(c.sectionId, (counts.get(c.sectionId) ?? 0) + 1);
    }
    return counts;
  }, [categories]);
  const visibleCategories = useMemo(
    () =>
      sectionFilter === null
        ? categories
        : sectionFilter === NO_SECTION
          ? categories.filter(c => !c.sectionId)
          : categories.filter(c => c.sectionId === sectionFilter),
    [categories, sectionFilter],
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
    onError: (error, categoryId) => {
      // The shell's error banner covers server failures. A refusal, such as a
      // category that still has tickets, comes back as a 400 that nothing
      // showed, so pressing Delete appeared to do nothing at all.
      if (isServerError(error)) return;
      const name = categories.find(c => c.id === categoryId)?.name;
      toast(`Couldn't delete ${name ? `"${name}"` : 'this category'}`, {
        description: extractErrorMessage(
          error,
          'Helpdesk refused to delete it. Try again, or reload the page.',
        ),
        variant: 'danger',
      });
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
    onError: error => {
      // As for categories: show a refusal rather than leave it silent.
      if (isServerError(error)) return;
      toast("Couldn't delete this section", {
        description: extractErrorMessage(
          error,
          'Helpdesk refused to delete it. Try again, or reload the page.',
        ),
        variant: 'danger',
      });
    },
  });

  // Stable, so the table's memoised columns are not rebuilt on every render.
  const handleEditCategory = useCallback((category: CategoryDto) => {
    setEditingCategory(category);
    setIsCategoryModalOpen(true);
  }, []);

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

  const deleteCategory = deleteCategoryMutation.mutate;
  const handleDeleteCategory = useCallback(
    async (categoryId: string) => {
      const cat = categories.find(c => c.id === categoryId);
      const ok = await confirm({
        title: 'Delete category?',
        body: `Delete "${cat?.name ?? 'this category'}"? This cannot be undone.`,
        confirmLabel: 'Delete',
        destructive: true,
      });
      if (ok) deleteCategory(categoryId);
    },
    [categories, confirm, deleteCategory],
  );

  const { mutate: setPortalEnquiry } = useSetPortalEnquiryCategory();
  const handleTogglePortalEnquiry = useCallback(
    async (category: CategoryDto) => {
      const isMarking = !category.isPortalEnquiryCategory;
      const current = categories.find(
        c => c.isPortalEnquiryCategory && c.id !== category.id,
      );
      if (isMarking && current) {
        const ok = await confirm({
          title: 'Move customer portal enquiries?',
          body: `"${current.name}" is currently used for customer portal enquiries. New enquiries will be filed under "${category.name}" instead. Existing tickets are not changed.`,
          confirmLabel: 'Move',
        });
        if (!ok) return;
      } else if (!isMarking) {
        const ok = await confirm({
          title: 'Stop customer portal enquiries?',
          body: `Customers will not be able to raise enquiries from the portal until another category is chosen.`,
          confirmLabel: 'Stop',
          destructive: true,
        });
        if (!ok) return;
      }
      setPortalEnquiry(
        { categoryId: category.id, isMarked: isMarking },
        {
          onSuccess: () =>
            toast(
              isMarking
                ? `"${category.name}" now receives customer portal enquiries`
                : `"${category.name}" no longer receives customer portal enquiries`,
              { variant: 'success' },
            ),
          onError: error => {
            if (isConflictError(error)) {
              toast('Customer portal enquiry category changed', {
                description:
                  'Another change was made at the same time. The list has been refreshed; try again.',
                variant: 'warning',
              });
              return;
            }
            if (isServerError(error)) return;
            toast("Couldn't update the customer portal enquiry category", {
              description: extractErrorMessage(error, 'Please try again.'),
              variant: 'danger',
            });
          },
        },
      );
    },
    [categories, confirm, setPortalEnquiry],
  );

  const handleDeleteSection = async (section: SectionDto) => {
    const ok = await confirm({
      title: 'Delete section?',
      body: `Delete "${section.name}"? It has no categories, so nothing else changes.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    deleteSectionMutation.mutate(section.id, {
      onSuccess: () => {
        if (sectionFilter === section.id) setSectionFilter(null);
      },
    });
  };

  const { table } = useCategoryTable({
    categories: visibleCategories,
    sections,
    searchTerm,
    isLoading,
    onEditCategory: handleEditCategory,
    onDeleteCategory: handleDeleteCategory,
    onTogglePortalEnquiry: handleTogglePortalEnquiry,
  });

  return (
    <ListPage
      title="Ticket Categories and Permissions"
      // ListPage wraps its main column in a plain block when it has a
      // sidebar, so <main> no longer stretches and the table stopped after
      // about five rows. Full height lets it run to the bottom of the page.
      className="lg:h-full"
      breadcrumbsKey="configuration.categories.list"
      table={table}
      isLoading={isLoading}
      sidebar={
        <SectionsPanel
          sections={sections}
          countsBySection={countsBySection}
          unsectionedCount={categories.filter(c => !c.sectionId).length}
          totalCount={categories.length}
          value={sectionFilter}
          onChange={setSectionFilter}
          onEdit={handleEditSection}
          onDelete={handleDeleteSection}
        />
      }
      actions={
        <div className="flex gap-2.5">
          <BaseButton
            icon={<Icon name="plus" className="h-3.5 w-3.5" />}
            onPress={handleCreateSection}
            variant="bordered"
            color="light"
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
