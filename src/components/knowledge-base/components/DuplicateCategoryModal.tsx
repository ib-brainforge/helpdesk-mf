import type { KnowledgeBaseCategoryDto } from '@/types';
import {
  BaseButton,
  BaseModal,
  BaseModalBody,
  BaseModalContent,
  BaseModalFooter,
  BaseModalHeader,
} from '@brainforgeau/components';
import { Switch } from '@heroui/react';
import { type FC, useState } from 'react';
import { useDuplicateKbCategory } from '../hooks/useKnowledgeBase';

interface DuplicateCategoryModalProps {
  isOpen: boolean;
  category: KnowledgeBaseCategoryDto | null;
  onClose: () => void;
}

export const DuplicateCategoryModal: FC<DuplicateCategoryModalProps> = ({
  isOpen,
  category,
  onClose,
}) => {
  const [includeArticles, setIncludeArticles] = useState(false);
  const duplicateMutation = useDuplicateKbCategory();

  const handleDuplicate = async () => {
    if (!category) return;
    try {
      await duplicateMutation.mutateAsync({ id: category.id, includeArticles });
      onClose();
    } catch {
      // Error handled by mutation
    }
  };

  const handleClose = () => {
    setIncludeArticles(false);
    onClose();
  };

  return (
    <BaseModal isOpen={isOpen} onClose={handleClose} size="md">
      <BaseModalContent>
        <BaseModalHeader>Duplicate Category</BaseModalHeader>
        <BaseModalBody>
          <div className="space-y-4">
            <p className="text-sm text-default-600">
              This will create a copy of <strong>{category?.name}</strong> named{' '}
              <strong>{category?.name} (copy)</strong> at the same level.
            </p>

            <div className="flex items-center justify-between p-3 rounded-lg bg-default-50">
              <div>
                <p className="text-sm font-medium">Include articles</p>
                <p className="text-xs text-default-500">
                  Duplicate all articles in this category into the new category
                </p>
              </div>
              <Switch
                isSelected={includeArticles}
                onValueChange={setIncludeArticles}
              />
            </div>

            {category &&
              (category.articleCount ?? 0) > 0 &&
              !includeArticles && (
                <p className="text-xs text-default-400">
                  Note: {category.articleCount} article
                  {(category.articleCount ?? 0) !== 1 ? 's' : ''} will not be
                  copied. Toggle "Include articles" to copy them too.
                </p>
              )}
          </div>
        </BaseModalBody>
        <BaseModalFooter>
          <BaseButton variant="bordered" onPress={handleClose}>
            Cancel
          </BaseButton>
          <BaseButton
            color="primary"
            onPress={handleDuplicate}
            isLoading={duplicateMutation.isPending}
          >
            Duplicate
          </BaseButton>
        </BaseModalFooter>
      </BaseModalContent>
    </BaseModal>
  );
};
