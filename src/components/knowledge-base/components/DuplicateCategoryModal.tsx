import { type FC, useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Switch } from '@heroui/react';
import { BaseButton } from '@brainforgeau/components/button';
import { useDuplicateKbCategory } from '../hooks/useKnowledgeBase';
import type { KnowledgeBaseCategoryDto } from '@/types';

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
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <ModalContent>
        <ModalHeader>
          <h2 className="text-xl font-semibold">Duplicate Category</h2>
        </ModalHeader>
        <ModalBody>
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

            {category && (category.articleCount ?? 0) > 0 && !includeArticles && (
              <p className="text-xs text-default-400">
                Note: {category.articleCount} article{(category.articleCount ?? 0) !== 1 ? 's' : ''} will not be copied.
                Toggle "Include articles" to copy them too.
              </p>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
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
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
