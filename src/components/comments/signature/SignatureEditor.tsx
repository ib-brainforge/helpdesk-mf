import {
  SIGNATURE_IMAGE_ACCEPT,
  checkSignatureImage,
  signatureImageUploadError,
  uploadSignatureImage,
} from '@/api/local/signature-images';
import { IconTip } from '@/components/shared';
import { Icon } from '@brainforgeau/components/base';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import { type Editor, EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  type FC,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  IMAGE_DEFAULT_WIDTH,
  IMAGE_MAX_WIDTH,
  IMAGE_MIN_WIDTH,
  SignatureImage,
  clampWidth,
} from './SignatureImage';
import { useSeedSignatureImage } from './useSignatureImageUrl';

/** Quick sizes for a selected image, in px. */
const PRESETS = [
  { label: 'S', title: 'Small (100px)', width: 100 },
  { label: 'M', title: 'Medium (160px)', width: 160 },
  { label: 'L', title: 'Large (240px)', width: 240 },
] as const;

const imageFilesOf = (list: FileList | null | undefined): File[] =>
  Array.from(list ?? []).filter(f => f.type.startsWith('image/'));

/** A new image's width: 160px, or its natural width when smaller. */
const defaultWidthOf = async (file: File): Promise<number> => {
  try {
    const bitmap = await createImageBitmap(file);
    const natural = bitmap.width;
    bitmap.close();
    return clampWidth(Math.min(IMAGE_DEFAULT_WIDTH, natural));
  } catch {
    return IMAGE_DEFAULT_WIDTH;
  }
};

const ToolButton: FC<{
  label: string;
  onPress: () => void;
  isActive?: boolean;
  isDisabled?: boolean;
  children: ReactNode;
}> = ({ label, onPress, isActive, isDisabled, children }) => (
  <IconTip label={label}>
    <button
      type="button"
      aria-label={label}
      aria-pressed={isActive}
      onClick={onPress}
      disabled={isDisabled}
      className={`flex h-7 min-w-7 items-center justify-center rounded-[3px] px-1 text-sm ${
        isActive
          ? 'bg-light-blue text-blue'
          : 'text-default-600 hover:bg-default-100'
      } disabled:opacity-40`}
    >
      {children}
    </button>
  </IconTip>
);

export interface SignatureEditorProps {
  /** The signature HTML, in the canonical form the server keeps. */
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

/**
 * The email signature editor (screen 08): text with bold, italic, underline
 * and links, and images uploaded from the computer (button, drag and drop,
 * or paste), resizable by a corner handle, quick sizes or an exact width.
 * Built on the TipTap packages already installed; the shared RichTextEditor
 * only takes an image URL and has no way to add an upload or a resize.
 */
export const SignatureEditor: FC<SignatureEditorProps> = ({
  content,
  onChange,
  placeholder = 'Your name, role and phone number',
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const seed = useSeedSignatureImage();

  // The editor and its paste and drop handlers are built once, so they reach
  // the upload through a ref that always holds the current one.
  const insertRef = useRef<(files: File[], at?: number) => void>(() => {});

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
      }),
      SignatureImage,
      Placeholder.configure({ placeholder }),
    ],
    content,
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
    editorProps: {
      attributes: {
        class:
          'min-h-[140px] p-2.5 text-xs leading-5 text-default-700 focus:outline-none [&_a]:text-blue [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5',
      },
      handlePaste: (_view, event) => {
        const files = imageFilesOf(event.clipboardData?.files);
        if (files.length === 0) return false;
        insertRef.current(files);
        return true;
      },
      handleDrop: (view, event, _slice, moved) => {
        if (moved) return false;
        const files = imageFilesOf(event.dataTransfer?.files);
        if (files.length === 0) return false;
        event.preventDefault();
        const at = view.posAtCoords({
          left: event.clientX,
          top: event.clientY,
        })?.pos;
        insertRef.current(files, at);
        return true;
      },
    },
  });

  // The saved signature arrives after the dialog opens; load it unless it is
  // already what the editor holds.
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, false);
    }
  }, [editor, content]);

  const insertImages = useCallback(
    async (files: File[], at?: number) => {
      if (!editor) return;
      setError(null);
      for (const file of files) {
        const problem = checkSignatureImage(file);
        if (problem) {
          setError(problem);
          continue;
        }
        setUploading(n => n + 1);
        try {
          const [uploaded, width] = await Promise.all([
            uploadSignatureImage(file),
            defaultWidthOf(file),
          ]);
          // Shown from the file in hand; nothing is fetched back.
          seed(uploaded.id, file);
          const node = {
            type: SignatureImage.name,
            attrs: { signatureImageId: uploaded.id, width, alt: '' },
          };
          const chain = editor.chain().focus();
          (at !== undefined
            ? chain.insertContentAt(at, node)
            : chain.insertContent(node)
          ).run();
        } catch (e) {
          setError(signatureImageUploadError(e));
        } finally {
          setUploading(n => n - 1);
        }
      }
    },
    [editor, seed],
  );
  insertRef.current = (files, at) => void insertImages(files, at);

  if (!editor) return null;

  const imageSelected = editor.isActive(SignatureImage.name);
  const selectedWidth = imageSelected
    ? (editor.getAttributes(SignatureImage.name).width as number | null)
    : null;
  // Without taking focus back to the text, so the slider keeps its drag.
  const setWidth = (px: number) =>
    editor
      .chain()
      .updateAttributes(SignatureImage.name, { width: clampWidth(px) })
      .run();

  const applyLink = () => {
    const href = (linkUrl ?? '').trim();
    const chain = editor.chain().focus().extendMarkRange('link');
    (href ? chain.setLink({ href }) : chain.unsetLink()).run();
    setLinkUrl(null);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-[#d1d9e0] p-1">
        <ToolButton
          label="Bold"
          isActive={editor.isActive('bold')}
          onPress={() => editor.chain().focus().toggleBold().run()}
        >
          <span className="font-extrabold">B</span>
        </ToolButton>
        <ToolButton
          label="Italic"
          isActive={editor.isActive('italic')}
          onPress={() => editor.chain().focus().toggleItalic().run()}
        >
          <span className="italic">I</span>
        </ToolButton>
        <ToolButton
          label="Underline"
          isActive={editor.isActive('underline')}
          onPress={() => editor.chain().focus().toggleUnderline().run()}
        >
          <span className="underline">U</span>
        </ToolButton>
        <ToolButton
          label="Link"
          isActive={editor.isActive('link') || linkUrl !== null}
          onPress={() =>
            setLinkUrl(
              linkUrl === null
                ? ((editor.getAttributes('link').href as string) ?? '')
                : null,
            )
          }
        >
          <Icon name="link" className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          label="Add an image (PNG, JPG or GIF, up to 1 MB)"
          isDisabled={uploading > 0}
          onPress={() => fileRef.current?.click()}
        >
          <Icon name="photo" className="h-4 w-4" />
        </ToolButton>
        <input
          ref={fileRef}
          type="file"
          accept={SIGNATURE_IMAGE_ACCEPT}
          className="hidden"
          onChange={e => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = '';
            void insertImages(files);
          }}
        />
        {uploading > 0 && (
          <span className="ml-1 text-xs text-default-500">
            Uploading image...
          </span>
        )}

        {imageSelected && (
          // Size of the selected image: quick sizes, or an exact width.
          <div className="ml-auto flex items-center gap-1">
            {PRESETS.map(p => (
              <ToolButton
                key={p.label}
                label={p.title}
                isActive={selectedWidth === p.width}
                onPress={() => setWidth(p.width)}
              >
                <span className="text-xs font-semibold">{p.label}</span>
              </ToolButton>
            ))}
            <input
              type="range"
              aria-label="Image width"
              min={IMAGE_MIN_WIDTH}
              max={IMAGE_MAX_WIDTH}
              value={selectedWidth ?? IMAGE_DEFAULT_WIDTH}
              onChange={e => setWidth(Number(e.target.value))}
              className="w-24"
            />
            <label className="flex items-center gap-1 text-xs text-default-500">
              <input
                type="number"
                aria-label="Image width in pixels"
                min={IMAGE_MIN_WIDTH}
                max={IMAGE_MAX_WIDTH}
                value={selectedWidth ?? ''}
                onChange={e => {
                  const px = Number(e.target.value);
                  if (px >= IMAGE_MIN_WIDTH) setWidth(px);
                }}
                className="h-7 w-14 rounded-[3px] border border-[#d1d9e0] px-1.5 text-xs"
              />
              px
            </label>
          </div>
        )}
      </div>

      {linkUrl !== null && (
        <div className="flex items-center gap-2 border-b border-[#d1d9e0] p-1.5">
          <input
            // biome-ignore lint/a11y/noAutofocus: opened by the Link button to type a URL
            autoFocus
            type="url"
            aria-label="Link address"
            placeholder="https://"
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                applyLink();
              }
              if (e.key === 'Escape') setLinkUrl(null);
            }}
            className="h-7 flex-1 rounded-[3px] border border-[#d1d9e0] px-2 text-xs"
          />
          <button
            type="button"
            onClick={applyLink}
            className="text-xs text-blue hover:underline"
          >
            {linkUrl.trim() ? 'Apply' : 'Remove link'}
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="px-2.5 pt-2 text-xs text-danger">
          {error}
        </p>
      )}

      <EditorContent editor={editor as Editor} />
      <p className="px-2.5 pb-2 text-[11px] text-default-400">
        Drop or paste an image to add it. Select an image to resize it.
      </p>
    </div>
  );
};
