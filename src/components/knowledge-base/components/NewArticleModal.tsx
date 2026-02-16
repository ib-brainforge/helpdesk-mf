import { type FC, useState, useCallback } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react';
import { BaseButton, BaseInput, BaseSelect, BaseSelectItem } from '@brainforgeau/components';
import { Switch, addToast } from '@heroui/react';
import { TipTapEditor } from './TipTapEditor';
import { useCreateKnowledgeBaseArticle, useKnowledgeBaseCategories } from '../hooks/useKnowledgeBase';
import { KnowledgeBaseAccessLevel, KnowledgeBaseStatus } from '@/types';

interface NewArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewArticleModal: FC<NewArticleModalProps> = ({ isOpen, onClose }) => {
  const [subject, setSubject] = useState('');
  const [details, setDetails] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [tags, setTags] = useState('');
  const [forTechniciansOnly, setForTechniciansOnly] = useState(false);

  const { data: categories } = useKnowledgeBaseCategories();
  const createMutation = useCreateKnowledgeBaseArticle();

  const handleCreate = useCallback(async () => {
    if (!subject.trim()) {
      addToast({
        title: 'Subject required',
        description: 'Please enter an article subject',
        severity: 'warning',
      });
      return;
    }

    try {
      await createMutation.mutateAsync({
        title: subject,
        body: details,
        categoryId: categoryId ?? undefined,
        tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        accessLevel: forTechniciansOnly ? KnowledgeBaseAccessLevel.Internal : KnowledgeBaseAccessLevel.Public,
        status: KnowledgeBaseStatus.Draft,
      });

      // Reset form
      setSubject('');
      setDetails('');
      setCategoryId(null);
      setTags('');
      setForTechniciansOnly(false);
      onClose();
    } catch (error) {
      // Error handled by mutation
    }
  }, [subject, details, categoryId, tags, forTechniciansOnly, createMutation, onClose]);

  const handleCancel = useCallback(() => {
    setSubject('');
    setDetails('');
    setCategoryId(null);
    setTags('');
    setForTechniciansOnly(false);
    onClose();
  }, [onClose]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl">
      <ModalContent>
        <ModalHeader>
          <h2 className="text-xl font-semibold">New Article</h2>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <BaseInput
              label="Subject"
              isRequired
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter article subject"
            />

            <div>
              <label className="block text-sm font-medium mb-2">Details</label>
              <TipTapEditor
                content={details}
                onChange={setDetails}
                placeholder="Write your article content here..."
              />
            </div>

            <BaseSelect
              label="Category"
              selectedKeys={categoryId ? new Set([categoryId]) : new Set()}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as string;
                setCategoryId(selected || null);
              }}
              placeholder="Select a category"
            >
              {(categories || []).map((category) => (
                <BaseSelectItem key={category.id ?? ''}>
                  {category.name}
                </BaseSelectItem>
              ))}
            </BaseSelect>

            <BaseInput
              label="Tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="tag1, tag2, tag3"
              description="Comma-separated tags"
            />

            <Switch
              isSelected={forTechniciansOnly}
              onValueChange={setForTechniciansOnly}
            >
              For technicians only
            </Switch>
          </div>
        </ModalBody>
        <ModalFooter>
          <BaseButton variant="light" onPress={handleCancel}>
            Cancel
          </BaseButton>
          <BaseButton
            color="primary"
            onPress={handleCreate}
            isLoading={createMutation.isPending}
          >
            Create
          </BaseButton>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
