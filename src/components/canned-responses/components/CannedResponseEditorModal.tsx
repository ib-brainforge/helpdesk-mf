import { useEffect, useState } from 'react';
import {
  BaseModal,
  BaseModalContent,
  BaseModalHeader,
  BaseModalBody,
  BaseModalFooter,
  BaseInput,
  BaseSelect,
  BaseSelectItem,
} from '@brainforgeau/components';
import { BaseButton } from '@brainforgeau/components/button';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Icon } from '@brainforgeau/components/base';
import { addToast } from '@heroui/react';
import { useCreateCannedResponse, useUpdateCannedResponse } from '../hooks/useCannedResponses';
import { CannedResponseScope } from '@/types/canned-response';
import type { CannedResponseDto } from '@/types/canned-response';
import { useCategoriesData } from '@/components/categories/hooks/useCategoriesData';

interface CannedResponseEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  cannedResponse?: CannedResponseDto;
}

export function CannedResponseEditorModal({
  isOpen,
  onClose,
  cannedResponse,
}: CannedResponseEditorModalProps) {
  const [title, setTitle] = useState('');
  const [scope, setScope] = useState<CannedResponseScope>(CannedResponseScope.Personal);
  const [categoryId, setCategoryId] = useState('');

  const isEditing = !!cannedResponse;

  const { categories, isLoading: isLoadingCategories } = useCategoriesData();
  const createMutation = useCreateCannedResponse();
  const updateMutation = useUpdateCannedResponse();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Write your canned response here...',
      }),
    ],
    content: cannedResponse?.body || '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4',
      },
    },
  });

  useEffect(() => {
    if (isOpen && cannedResponse) {
      setTitle(cannedResponse.title || '');
      setScope((cannedResponse.scope as unknown as CannedResponseScope) || CannedResponseScope.Personal);
      setCategoryId(cannedResponse.categoryId || '');
      editor?.commands.setContent(cannedResponse.body || '');
    } else if (isOpen && !cannedResponse) {
      setTitle('');
      setScope(CannedResponseScope.Personal);
      setCategoryId('');
      editor?.commands.setContent('');
    }
  }, [isOpen, cannedResponse, editor]);

  const handleSave = async () => {
    if (!title.trim()) {
      addToast({
        title: 'Validation error',
        description: 'Title is required',
        severity: 'danger',
      });
      return;
    }

    const body = editor?.getHTML() || '';

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          id: cannedResponse!.id!,
          updates: {
            title,
            body,
            scope: scope as any,
            categoryId: categoryId || undefined,
          },
        });
        addToast({
          title: 'Updated',
          description: 'Canned response updated successfully',
          severity: 'success',
        });
      } else {
        await createMutation.mutateAsync({
          title,
          body,
          scope: scope as any,
          categoryId: categoryId || undefined,
        });
        addToast({
          title: 'Created',
          description: 'Canned response created successfully',
          severity: 'success',
        });
      }
      onClose();
    } catch (error) {
      addToast({
        title: 'Error',
        description: `Failed to ${isEditing ? 'update' : 'create'} canned response`,
        severity: 'danger',
      });
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} size="3xl">
      <BaseModalContent>
        <BaseModalHeader title={isEditing ? 'Edit Canned Response' : 'Create Canned Response'}>
          {isEditing ? 'Edit Canned Response' : 'Create Canned Response'}
        </BaseModalHeader>
        <BaseModalBody>
          <div className="space-y-4">
            <BaseInput
              label="Name"
              placeholder="Enter response name"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              isRequired
            />

            <div>
              <label className="block text-sm font-medium mb-2">Body</label>
              <div className="border rounded-lg overflow-hidden">
                {/* Toolbar */}
                <div className="flex gap-1 p-2 border-b bg-default-50">
                  <button
                    type="button"
                    onClick={() => editor?.chain().focus().toggleBold().run()}
                    className={`p-1.5 rounded hover:bg-default-100 ${
                      editor?.isActive('bold') ? 'bg-default-200' : ''
                    }`}
                    title="Bold"
                  >
                    <Icon name="bold" className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => editor?.chain().focus().toggleItalic().run()}
                    className={`p-1.5 rounded hover:bg-default-100 ${
                      editor?.isActive('italic') ? 'bg-default-200' : ''
                    }`}
                    title="Italic"
                  >
                    <Icon name="italic" className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => editor?.chain().focus().toggleBulletList().run()}
                    className={`p-1.5 rounded hover:bg-default-100 ${
                      editor?.isActive('bulletList') ? 'bg-default-200' : ''
                    }`}
                    title="Bullet List"
                  >
                    <Icon name="list-bullet" className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                    className={`p-1.5 rounded hover:bg-default-100 ${
                      editor?.isActive('orderedList') ? 'bg-default-200' : ''
                    }`}
                    title="Numbered List"
                  >
                    <Icon name="numbered-list" className="h-4 w-4" />
                  </button>
                </div>

                {/* Editor */}
                <EditorContent editor={editor} />
              </div>
            </div>

            <BaseSelect
              label="Scope"
              placeholder="Select scope"
              selectedKeys={new Set([scope.toString()])}
              onSelectionChange={(keys) => {
                const key = Array.from(keys)[0] as string;
                setScope(Number.parseInt(key) as unknown as CannedResponseScope);
              }}
            >
              <BaseSelectItem key={CannedResponseScope.Personal.toString()}>
                Personal - Only visible to you
              </BaseSelectItem>
              <BaseSelectItem key={CannedResponseScope.Team.toString()}>
                Team - Visible to your team
              </BaseSelectItem>
              <BaseSelectItem key={CannedResponseScope.Global.toString()}>
                Global - Visible to everyone
              </BaseSelectItem>
            </BaseSelect>

            <BaseSelect
              label="Category"
              placeholder="Select category (optional)"
              selectedKeys={categoryId ? new Set([categoryId]) : new Set()}
              onSelectionChange={(keys) => {
                const key = Array.from(keys)[0] as string;
                setCategoryId(key || '');
              }}
              isLoading={isLoadingCategories}
            >
              {[
                <BaseSelectItem key="">None</BaseSelectItem>,
                ...categories.map((cat) => (
                  <BaseSelectItem key={cat.id}>
                    {cat.sectionName ? `${cat.sectionName} / ${cat.name}` : cat.name}
                  </BaseSelectItem>
                )),
              ]}
            </BaseSelect>
          </div>
        </BaseModalBody>
        <BaseModalFooter>
          <BaseButton variant="bordered" onPress={onClose}>
            Cancel
          </BaseButton>
          <BaseButton
            color="primary"
            onPress={handleSave}
            isLoading={createMutation.isPending || updateMutation.isPending}
          >
            {isEditing ? 'Update' : 'Create'}
          </BaseButton>
        </BaseModalFooter>
      </BaseModalContent>
    </BaseModal>
  );
}
