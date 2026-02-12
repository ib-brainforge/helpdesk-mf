import { Breadcrumbs } from '@/components/Breadcrumbs';
import { BaseButton } from '@brainforgeau/components/button';
import { Icon } from '@brainforgeau/components/base';
import {
  CategoryEditorModal,
  SectionEditorModal,
  CategoryList,
  useCategoriesData,
} from '@components/categories';
import { addToast } from '@heroui/react';
import { Helmet } from '@modern-js/runtime/head';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { CategoriesApi } from '@brainforgeau/helpdesk-client';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type { CategoryDto, SectionDto } from '@/types/category';

function CategoriesPage() {
  const { categories, sections, isLoading, refetchAll } = useCategoriesData();
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryDto | undefined>(undefined);
  const [editingSection, setEditingSection] = useState<SectionDto | undefined>(undefined);

  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      const client = await createHelpdeskApiClient(CategoriesApi);
      await client.v1CategoriesIdDelete(categoryId);
    },
    onSuccess: () => {
      addToast({ title: 'Category deleted successfully', severity: 'success' });
      refetchAll();
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
      addToast({ title: 'Section deleted successfully', severity: 'success' });
      refetchAll();
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

  return (
    <>
      <Helmet>
        <title>Category Management</title>
      </Helmet>
      <div className="mb-5">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Configuration', href: '/configuration' },
            { label: 'Categories', href: '/configuration/categories', isCurrent: true },
          ]}
        />

        <div className="mb-5 items-start gap-5 lg:flex">
          <h1 className="text-gray mb-2 text-2xl font-semibold md:mb-0 dark:text-white">
            Category Management
          </h1>
          <div className="flex shrink-0 justify-end gap-2.5 md:ml-auto">
            <BaseButton
              icon={<Icon name="plus" className="h-3.5 w-3.5" />}
              onPress={handleCreateSection}
              variant="bordered"
            >
              Section
            </BaseButton>
            <BaseButton
              icon={<Icon name="plus" className="h-3.5 w-3.5" />}
              onPress={handleCreateCategory}
            >
              Category
            </BaseButton>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-default-500">Loading...</div>
          </div>
        ) : categories.length === 0 && sections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Icon name="folder" className="h-12 w-12 text-default-300 mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No categories yet
            </h2>
            <p className="text-muted-foreground mb-4">
              Get started by creating your first category or section.
            </p>
            <div className="flex gap-2">
              <BaseButton variant="bordered" onPress={handleCreateSection}>
                Create Section
              </BaseButton>
              <BaseButton onPress={handleCreateCategory}>
                Create Category
              </BaseButton>
            </div>
          </div>
        ) : (
          <CategoryList
            categories={categories}
            sections={sections}
            onEditCategory={handleEditCategory}
            onDeleteCategory={(id) => deleteCategoryMutation.mutate(id)}
            onEditSection={handleEditSection}
            onDeleteSection={(id) => deleteSectionMutation.mutate(id)}
          />
        )}
      </div>

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
    </>
  );
}

export default CategoriesPage;
