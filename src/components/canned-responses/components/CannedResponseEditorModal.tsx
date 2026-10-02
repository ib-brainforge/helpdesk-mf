import { ModalHeader } from '@/components/shared';
import {
  BaseInput,
  BaseModal,
  BaseModalBody,
  BaseModalContent,
  BaseModalFooter,
  BaseSelect,
  BaseSelectItem,
  ContextScopeStrip,
} from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import { BaseButton } from '@brainforgeau/components/button';
import { MetadataPanel } from '@brainforgeau/components/metadata-panel';
import { ScopeApi } from '@brainforgeau/helpdesk-client';
import { toast } from '@heroui/react';
import { useQueryClient } from '@tanstack/react-query';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useState } from 'react';

import { useCategoriesData } from '@/components/categories/hooks/useCategoriesData';
import { useEntityScopeStrip } from '@/hooks/useEntityScopeStrip';
import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import { CannedResponseScope } from '@/types/canned-response';
import type { CannedResponseDto } from '@/types/canned-response';
import {
  useCreateCannedResponse,
  useUpdateCannedResponse,
} from '../hooks/useCannedResponses';

const CANNED_RESPONSES_QUERY_KEY = 'helpdesk-canned-responses';

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
  const [scope, setScope] = useState<CannedResponseScope>(
    CannedResponseScope.Personal,
  );
  const [categoryId, setCategoryId] = useState('');

  const isEditing = !!cannedResponse;

  const { categories, isLoading: isLoadingCategories } = useCategoriesData();
  const createMutation = useCreateCannedResponse();
  const updateMutation = useUpdateCannedResponse();
  const queryClient = useQueryClient();

  // DTO tenancy/scope metadata initiative -- only meaningful once the
  // response exists (has an id/meta); the create form has nothing to place
  // yet (gated on `isEditing` below).
  const {
    stripProps: scopeStripProps,
    metaForPanel,
    scopeBadge,
    canViewMetadata,
  } = useEntityScopeStrip({
    mode: 'modal',
    entityLabel: 'Canned response',
    meta: cannedResponse?.meta,
    patchScope: async patch => {
      if (!cannedResponse?.id) return;
      const client = await createHelpdeskApiClient(ScopeApi);
      // entityType verified against helpdesk-backend's `HelpdeskDbContext`
      // (`DbSet<CannedResponse> CannedResponses`).
      await client.v1ScopeEntityTypeIdPatch(
        'CannedResponse',
        cannedResponse.id,
        patch,
      );
    },
    onSaved: () => {
      queryClient.invalidateQueries({
        queryKey: [CANNED_RESPONSES_QUERY_KEY],
      });
    },
  });

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
      setScope(cannedResponse.scope ?? CannedResponseScope.Personal);
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
      toast('Validation error', {
        description: 'Title is required',
        variant: 'danger',
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
            scope,
            categoryId: categoryId || undefined,
          },
        });
        toast('Updated', {
          description: 'Canned response updated successfully',
          variant: 'success',
        });
      } else {
        await createMutation.mutateAsync({
          title,
          body,
          scope,
          categoryId: categoryId || undefined,
        });
        toast('Created', {
          description: 'Canned response created successfully',
          variant: 'success',
        });
      }
      onClose();
    } catch (error) {
      toast('Error', {
        description: `Failed to ${isEditing ? 'update' : 'create'} canned response`,
        variant: 'danger',
      });
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      className="max-w-3xl"
    >
      <BaseModalContent>
        <ModalHeader>
          {isEditing ? 'Edit Canned Response' : 'Create Canned Response'}
        </ModalHeader>
        <BaseModalBody>
          <div className="space-y-4">
            <BaseInput
              label="Name"
              placeholder="Enter response name"
              value={title}
              onChange={e => setTitle(e.target.value)}
              isRequired
            />

            {isEditing && <ContextScopeStrip {...scopeStripProps} />}
            {isEditing && (
              <MetadataPanel
                meta={metaForPanel}
                scopeBadge={scopeBadge}
                canViewMetadata={canViewMetadata}
              />
            )}

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
                    onClick={() =>
                      editor?.chain().focus().toggleBulletList().run()
                    }
                    className={`p-1.5 rounded hover:bg-default-100 ${
                      editor?.isActive('bulletList') ? 'bg-default-200' : ''
                    }`}
                    title="Bullet List"
                  >
                    <Icon name="list-bullet" className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      editor?.chain().focus().toggleOrderedList().run()
                    }
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
              selectedKey={scope}
              onSelectionChange={keys => {
                const key = keys as CannedResponseScope;
                if (key) setScope(key);
              }}
            >
              <BaseSelectItem
                key={CannedResponseScope.Personal}
                value={CannedResponseScope.Personal}
              >
                Personal - Only visible to you
              </BaseSelectItem>
              <BaseSelectItem
                key={CannedResponseScope.Shared}
                value={CannedResponseScope.Shared}
              >
                Shared - Visible to everyone
              </BaseSelectItem>
            </BaseSelect>

            <BaseSelect
              label="Category"
              placeholder="Select category (optional)"
              selectedKey={categoryId || '__none__'}
              onSelectionChange={key => {
                setCategoryId(key === '__none__' ? '' : (key as string));
              }}
            >
              {[
                <BaseSelectItem key="__none__" id="__none__">
                  None
                </BaseSelectItem>,
                ...categories.map(cat => (
                  <BaseSelectItem key={cat.id} value={cat.id}>
                    {cat.sectionName
                      ? `${cat.sectionName} / ${cat.name}`
                      : cat.name}
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
            isDisabled={createMutation.isPending || updateMutation.isPending}
          >
            {isEditing ? 'Update' : 'Create'}
          </BaseButton>
        </BaseModalFooter>
      </BaseModalContent>
    </BaseModal>
  );
}
