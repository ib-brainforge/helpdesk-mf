import { SIGNATURE_IMAGE_SCHEME } from '@/api/local/signature-images';
import Image from '@tiptap/extension-image';
import {
  type NodeViewProps,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from '@tiptap/react';
import {
  type FC,
  type PointerEvent as ReactPointerEvent,
  useRef,
  useState,
} from 'react';
import { useSignatureImageUrls } from './useSignatureImageUrl';

/** A logo never shrinks below or grows past these, in px. */
export const IMAGE_MIN_WIDTH = 40;
export const IMAGE_MAX_WIDTH = 600;
/** A new image starts at this width, or its natural width when smaller. */
export const IMAGE_DEFAULT_WIDTH = 160;

export const clampWidth = (px: number) =>
  Math.round(Math.min(IMAGE_MAX_WIDTH, Math.max(IMAGE_MIN_WIDTH, px)));

const idFromSrc = (src: string | null) =>
  src?.startsWith(SIGNATURE_IMAGE_SCHEME)
    ? src.slice(SIGNATURE_IMAGE_SCHEME.length)
    : null;

const widthFrom = (el: HTMLElement): number | null => {
  const attr = Number.parseInt(el.getAttribute('width') ?? '', 10);
  if (attr > 0) return attr;
  const style = Number.parseInt(el.style.width ?? '', 10);
  return style > 0 ? style : null;
};

/**
 * The image in the editor: shown through its object URL, with a corner
 * handle to drag it wider or narrower (the height follows, so the aspect
 * ratio holds). The width is only committed when the drag ends.
 */
const ResizableImageView: FC<NodeViewProps> = ({
  node,
  selected,
  updateAttributes,
}) => {
  const {
    src,
    signatureImageId: id,
    width,
    alt,
  } = node.attrs as {
    src: string | null;
    signatureImageId: string | null;
    width: number | null;
    alt: string | null;
  };
  const urls = useSignatureImageUrls(id ? [id] : []);
  const displaySrc = id ? urls[id] : (src ?? undefined);
  const imgRef = useRef<HTMLImageElement>(null);
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const shown = dragWidth ?? width ?? undefined;

  const startDrag = (e: ReactPointerEvent<HTMLSpanElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = imgRef.current?.offsetWidth ?? width ?? 160;
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    let latest = startWidth;
    const move = (ev: PointerEvent) => {
      latest = clampWidth(startWidth + ev.clientX - startX);
      setDragWidth(latest);
    };
    const end = () => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', end);
      target.removeEventListener('pointercancel', end);
      setDragWidth(null);
      updateAttributes({ width: latest });
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', end);
    target.addEventListener('pointercancel', end);
  };

  return (
    <NodeViewWrapper
      as="span"
      className="relative inline-block max-w-full align-bottom leading-none"
    >
      {displaySrc ? (
        <img
          ref={imgRef}
          src={displaySrc}
          alt={alt ?? ''}
          width={shown}
          style={{ width: shown, maxWidth: '100%', height: 'auto' }}
          className={selected ? 'outline outline-2 outline-blue' : ''}
          draggable={false}
        />
      ) : (
        // Still loading its bytes: hold the space at the saved width.
        <span
          className="inline-block h-10 animate-pulse rounded-[2px] bg-default-100"
          style={{ width: shown ?? IMAGE_DEFAULT_WIDTH }}
        />
      )}
      {selected && (
        <span
          role="presentation"
          onPointerDown={startDrag}
          title="Drag to resize"
          className="absolute -right-1.5 -bottom-1.5 h-3 w-3 cursor-nwse-resize rounded-[2px] border border-white bg-blue"
        />
      )}
    </NodeViewWrapper>
  );
};

/**
 * The editor's image: an uploaded signature image or an https one, with a
 * width. Written out as the canonical form the server keeps (see
 * api/local/signature-images.ts), with the width in both the width
 * attribute (Outlook honours it) and the inline style, so the preview and the
 * sent email are the same size.
 */
export const SignatureImage = Image.extend({
  draggable: true,

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: el => widthFrom(el),
        renderHTML: () => ({}),
      },
      signatureImageId: {
        default: null,
        parseHTML: el =>
          el.getAttribute('data-signature-image-id') ??
          idFromSrc(el.getAttribute('src')),
        renderHTML: () => ({}),
      },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    const { signatureImageId: id, width } = node.attrs as {
      signatureImageId: string | null;
      width: number | null;
    };
    const attrs: Record<string, string> = {
      ...HTMLAttributes,
      alt: node.attrs.alt ?? '',
    };
    if (id) {
      attrs.src = `${SIGNATURE_IMAGE_SCHEME}${id}`;
      attrs['data-signature-image-id'] = id;
    }
    if (width) {
      attrs.width = String(width);
      attrs.style = `width:${width}px;max-width:100%;height:auto`;
    }
    return ['img', attrs];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
}).configure({ inline: true, allowBase64: false });
