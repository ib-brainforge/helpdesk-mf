import { ModalHeader } from '@/components/shared';
import { KnowledgeBaseAccessLevel, KnowledgeBaseStatus } from '@/types';
import {
  BaseButton,
  BaseInput,
  BaseModal,
  BaseModalBody,
  BaseModalContent,
  BaseModalFooter,
  BaseSelect,
  BaseSelectItem,
  BaseToggle,
} from '@brainforgeau/components';
import { toast } from '@heroui/react';
import { type FC, useCallback, useState } from 'react';
import {
  useCreateKnowledgeBaseArticle,
  useKnowledgeBaseCategories,
} from '../hooks/useKnowledgeBase';
import { TipTapEditor } from './TipTapEditor';

interface NewArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewArticleModal: FC<NewArticleModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [subject, setSubject] = useState('');
  const [details, setDetails] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [tags, setTags] = useState('');
  const [forTechniciansOnly, setForTechniciansOnly] = useState(false);

  const { data: categories } = useKnowledgeBaseCategories();
  const createMutation = useCreateKnowledgeBaseArticle();

  const handleCreate = useCallback(async () => {
    if (!subject.trim()) {
      toast('Subject required', {
        description: 'Please enter an article subject',
        variant: 'warning',
      });
      return;
    }

    try {
      await createMutation.mutateAsync({
        title: subject,
        body: details,
        categoryId: categoryId ?? undefined,
        tags: tags
          ? tags
              .split(',')
              .map(t => t.trim())
              .filter(Boolean)
          : [],
        accessLevel: forTechniciansOnly
          ? KnowledgeBaseAccessLevel.Authenticated
          : KnowledgeBaseAccessLevel.Public,
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
  }, [
    subject,
    details,
    categoryId,
    tags,
    forTechniciansOnly,
    createMutation,
    onClose,
  ]);

  const handleCancel = useCallback(() => {
    setSubject('');
    setDetails('');
    setCategoryId(null);
    setTags('');
    setForTechniciansOnly(false);
    onClose();
  }, [onClose]);

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      className="max-w-3xl"
    >
      <BaseModalContent>
        <ModalHeader>New Article</ModalHeader>
        <BaseModalBody>
          <div className="space-y-4">
            <BaseInput
              label="Subject"
              isRequired
              value={subject}
              onChange={e => setSubject(e.target.value)}
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
              selectedKey={categoryId ? categoryId : null}
              onSelectionChange={keys => {
                const selected = keys as string;
                setCategoryId(selected || null);
              }}
              placeholder="Select a category"
            >
              {(categories || []).map(category => (
                <BaseSelectItem
                  key={category.id ?? ''}
                  value={category.id ?? ''}
                >
                  {category.name}
                </BaseSelectItem>
              ))}
            </BaseSelect>

            <BaseInput
              label="Tags"
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="tag1, tag2, tag3"
              description="Comma-separated tags"
            />

            <BaseToggle
              isSelected={forTechniciansOnly}
              onChange={setForTechniciansOnly}
            >
              For technicians only
            </BaseToggle>
          </div>
        </BaseModalBody>
        <BaseModalFooter>
          <BaseButton variant="light" onPress={handleCancel}>
            Cancel
          </BaseButton>
          <BaseButton
            color="primary"
            onPress={handleCreate}
            isDisabled={createMutation.isPending}
          >
            Create
          </BaseButton>
        </BaseModalFooter>
      </BaseModalContent>
    </BaseModal>
  );
};
