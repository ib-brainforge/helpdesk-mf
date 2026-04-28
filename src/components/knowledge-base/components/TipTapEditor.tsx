import { type FC } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import CodeBlock from '@tiptap/extension-code-block';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import Highlight from '@tiptap/extension-highlight';
import { Icon } from '@brainforgeau/components/base';
import { BaseButton } from '@brainforgeau/components/button';

interface TipTapEditorProps {
  content?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  editable?: boolean;
}

interface TipTapMenuBarProps {
  editor: Editor | null;
}

const TipTapMenuBar: FC<TipTapMenuBarProps> = ({ editor }) => {
  if (!editor) {
    return null;
  }

  const buttonClass = 'min-w-unit-9 h-unit-9 p-0';

  return (
    <div className="flex flex-wrap gap-1 border-b border-divider pb-2 mb-2">
      {/* Text Formatting */}
      <BaseButton
        size="sm"
        variant={editor.isActive('bold') ? 'bordered' : 'light'}
        onPress={() => editor.chain().focus().toggleBold().run()}
        isIconOnly
        className={buttonClass}
        title="Bold"
      >
        <strong>B</strong>
      </BaseButton>
      <BaseButton
        size="sm"
        variant={editor.isActive('italic') ? 'bordered' : 'light'}
        onPress={() => editor.chain().focus().toggleItalic().run()}
        isIconOnly
        className={buttonClass}
        title="Italic"
      >
        <em>I</em>
      </BaseButton>
      <BaseButton
        size="sm"
        variant={editor.isActive('strike') ? 'bordered' : 'light'}
        onPress={() => editor.chain().focus().toggleStrike().run()}
        isIconOnly
        className={buttonClass}
        title="Strikethrough"
      >
        <s>S</s>
      </BaseButton>
      <BaseButton
        size="sm"
        variant={editor.isActive('code') ? 'bordered' : 'light'}
        onPress={() => editor.chain().focus().toggleCode().run()}
        isIconOnly
        className={buttonClass}
        title="Inline Code"
      >
        <code>&lt;&gt;</code>
      </BaseButton>
      <BaseButton
        size="sm"
        variant={editor.isActive('highlight') ? 'bordered' : 'light'}
        onPress={() => editor.chain().focus().toggleHighlight().run()}
        isIconOnly
        className={buttonClass}
        title="Highlight"
      >
        <Icon name="pencil" className="h-4 w-4" />
      </BaseButton>

      <div className="w-px h-6 bg-divider mx-1" />

      {/* Headings */}
      <BaseButton
        size="sm"
        variant={editor.isActive('heading', { level: 1 }) ? 'bordered' : 'light'}
        onPress={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isIconOnly
        className={buttonClass}
        title="Heading 1"
      >
        <span className="text-xs font-bold">H1</span>
      </BaseButton>
      <BaseButton
        size="sm"
        variant={editor.isActive('heading', { level: 2 }) ? 'bordered' : 'light'}
        onPress={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isIconOnly
        className={buttonClass}
        title="Heading 2"
      >
        <span className="text-xs font-bold">H2</span>
      </BaseButton>
      <BaseButton
        size="sm"
        variant={editor.isActive('heading', { level: 3 }) ? 'bordered' : 'light'}
        onPress={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isIconOnly
        className={buttonClass}
        title="Heading 3"
      >
        <span className="text-xs font-bold">H3</span>
      </BaseButton>

      <div className="w-px h-6 bg-divider mx-1" />

      {/* Lists */}
      <BaseButton
        size="sm"
        variant={editor.isActive('bulletList') ? 'bordered' : 'light'}
        onPress={() => editor.chain().focus().toggleBulletList().run()}
        isIconOnly
        className={buttonClass}
        title="Bullet List"
      >
        <Icon name="list-bullet" className="h-4 w-4" />
      </BaseButton>
      <BaseButton
        size="sm"
        variant={editor.isActive('orderedList') ? 'bordered' : 'light'}
        onPress={() => editor.chain().focus().toggleOrderedList().run()}
        isIconOnly
        className={buttonClass}
        title="Numbered List"
      >
        <span className="text-xs font-bold">1.</span>
      </BaseButton>

      <div className="w-px h-6 bg-divider mx-1" />

      {/* Blocks */}
      <BaseButton
        size="sm"
        variant={editor.isActive('blockquote') ? 'bordered' : 'light'}
        onPress={() => editor.chain().focus().toggleBlockquote().run()}
        isIconOnly
        className={buttonClass}
        title="Quote"
      >
        <Icon name="chat-bubble-left-right" className="h-4 w-4" />
      </BaseButton>
      <BaseButton
        size="sm"
        variant={editor.isActive('codeBlock') ? 'bordered' : 'light'}
        onPress={() => editor.chain().focus().toggleCodeBlock().run()}
        isIconOnly
        className={buttonClass}
        title="Code Block"
      >
        <span className="text-xs font-mono">{'{}'}</span>
      </BaseButton>
      <BaseButton
        size="sm"
        variant="light"
        onPress={() => editor.chain().focus().setHorizontalRule().run()}
        isIconOnly
        className={buttonClass}
        title="Horizontal Rule"
      >
        <Icon name="minus" className="h-4 w-4" />
      </BaseButton>

      <div className="w-px h-6 bg-divider mx-1" />

      {/* Table */}
      <BaseButton
        size="sm"
        variant={editor.isActive('table') ? 'bordered' : 'light'}
        onPress={() =>
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        }
        isIconOnly
        className={buttonClass}
        title="Insert Table"
      >
        <Icon name="table-cells" className="h-4 w-4" />
      </BaseButton>

      <div className="w-px h-6 bg-divider mx-1" />

      {/* Link */}
      <BaseButton
        size="sm"
        variant={editor.isActive('link') ? 'bordered' : 'light'}
        onPress={() => {
          const url = window.prompt('Enter URL');
          if (url) {
            editor.chain().focus().setLink({ href: url }).run();
          }
        }}
        isIconOnly
        className={buttonClass}
        title="Add Link"
      >
        <Icon name="link" className="h-4 w-4" />
      </BaseButton>

      <div className="w-px h-6 bg-divider mx-1" />

      {/* Undo/Redo */}
      <BaseButton
        size="sm"
        variant="light"
        onPress={() => editor.chain().focus().undo().run()}
        isDisabled={!editor.can().undo()}
        isIconOnly
        className={buttonClass}
        title="Undo"
      >
        <Icon name="arrow-uturn-left" className="h-4 w-4" />
      </BaseButton>
      <BaseButton
        size="sm"
        variant="light"
        onPress={() => editor.chain().focus().redo().run()}
        isDisabled={!editor.can().redo()}
        isIconOnly
        className={buttonClass}
        title="Redo"
      >
        <Icon name="arrow-uturn-right" className="h-4 w-4" />
      </BaseButton>
    </div>
  );
};

export const TipTapEditor: FC<TipTapEditorProps> = ({
  content = '',
  onChange,
  placeholder = 'Write your article content here...',
  editable = true,
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline hover:opacity-80',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      CodeBlock.configure({
        HTMLAttributes: {
          class: 'bg-default-100 rounded-lg p-4 font-mono text-sm',
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse table-auto w-full',
        },
      }),
      TableRow.configure({
        HTMLAttributes: {
          class: 'border-b border-divider',
        },
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class: 'border border-divider bg-default-100 px-4 py-2 text-left font-semibold',
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-divider px-4 py-2',
        },
      }),
      Highlight.configure({
        HTMLAttributes: {
          class: 'bg-warning-100 dark:bg-warning-900/30 px-1 rounded',
        },
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-sm sm:prose lg:prose-lg max-w-none focus:outline-none min-h-[300px] p-4 border border-divider rounded-lg',
      },
    },
  });

  return (
    <div className="tiptap-editor">
      {editable && <TipTapMenuBar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
};
