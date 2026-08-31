import { BaseButton, BaseInput } from '@brainforgeau/components';
import { RichTextEditor } from '@brainforgeau/components/text-editor';
import DOMPurify from 'dompurify';
import { type FC, useEffect, useRef, useState } from 'react';

/**
 * Does this string carry markup, or is it plain text that merely contains
 * angle brackets?
 *
 * Descriptions predating the rich-text editor are plain text with real
 * newlines, and there are thousands of them. Rendering those as HTML would
 * collapse every line break; rendering genuine HTML as text would show the
 * tags. The two cases have to be told apart at display time.
 *
 * The test looks for a tag with a known-ish shape rather than any `<`, so a
 * description reading "if x < y then" is treated as the plain text it is.
 */
const looksLikeHtml = (value: string): boolean =>
  /<\/?[a-z][a-z0-9]*(\s[^<>]*)?>/i.test(value);

interface InlineEditableProps {
  value: string;
  /**
   * Called with the new value on save. The caller is responsible for sending
   * subject and description together: the API's update is a full replace, and
   * omitting one field clears it.
   */
  onSave: (next: string) => void;
  isSaving?: boolean;
  /** `heading` is a single-line input; `richText` is the tiptap editor. */
  variant: 'heading' | 'richText';
  /** Shown in place of an empty value, and as the editor's placeholder. */
  emptyLabel?: string;
  /** False renders display-only, with no double-click affordance. */
  canEdit?: boolean;
}

/**
 * Double-click to edit, with explicit Save and Cancel.
 *
 * WHY EXPLICIT BUTTONS: committing on blur loses work to a stray click, and
 * gives no signal that anything was saved. That is tolerable for a one-word
 * field and not for a ticket description someone just wrote three paragraphs
 * into. Escape cancels, and Enter saves in the heading variant only, where it
 * cannot be part of the value.
 *
 * DISCOVERABILITY: double-click has no visual affordance of its own, so the
 * display state carries a hover background and a title. Without that the
 * feature is invisible to anyone not told it exists.
 */
export const InlineEditable: FC<InlineEditableProps> = ({
  value,
  onSave,
  isSaving = false,
  variant,
  emptyLabel = 'Click to add',
  canEdit = true,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Re-sync when the ticket reloads underneath us, but never while editing:
  // a refetch mid-edit would otherwise silently discard what was typed.
  useEffect(() => {
    if (!isEditing) setDraft(value);
  }, [value, isEditing]);

  const beginEdit = () => {
    if (!canEdit) return;
    setDraft(value);
    setIsEditing(true);
  };

  const cancel = () => {
    setDraft(value);
    setIsEditing(false);
  };

  const commit = () => {
    const next = draft.trim();
    // An empty subject is rejected by the domain, and an unchanged value is a
    // pointless write plus a pointless audit entry.
    if (next === value.trim() || (variant === 'heading' && !next)) {
      cancel();
      return;
    }
    onSave(next);
    setIsEditing(false);
  };

  if (!isEditing) {
    const hoverable = canEdit
      ? 'cursor-text rounded transition-colors hover:bg-default-100'
      : '';
    const title = canEdit ? 'Double-click to edit' : undefined;

    if (variant === 'heading') {
      return (
        <h1
          className={`text-2xl font-semibold ${hoverable} -mx-1 px-1`}
          onDoubleClick={beginEdit}
          title={title}
        >
          {value || (
            <span className="text-default-400 italic">{emptyLabel}</span>
          )}
        </h1>
      );
    }

    return (
      <div
        className={`${hoverable} -mx-2 px-2 py-1`}
        onDoubleClick={beginEdit}
        title={title}
      >
        {value ? (
          <div className="prose max-w-none">
            {looksLikeHtml(value) ? (
              <div
                // biome-ignore lint/security/noDangerouslySetInnerHtml: the value is passed through DOMPurify.sanitize on this same line. Ticket descriptions are untrusted (any requester, or an inbound email, controls the string) and the backend sanitiser is currently wired to knowledge-base articles only, so this is the gate.
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(value) }}
              />
            ) : (
              <p className="whitespace-pre-wrap">{value}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-default-400 italic">{emptyLabel}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {variant === 'heading' ? (
        <BaseInput
          ref={inputRef}
          autoFocus
          value={draft}
          onValueChange={setDraft}
          onKeyDown={e => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') cancel();
          }}
          isDisabled={isSaving}
        />
      ) : (
        <div
          onKeyDown={e => {
            if (e.key === 'Escape') cancel();
          }}
        >
          <RichTextEditor
            content={draft}
            onChange={setDraft}
            placeholder={emptyLabel}
          />
        </div>
      )}
      <div className="flex gap-2">
        <BaseButton
          size="sm"
          color="primary"
          onPress={commit}
          isDisabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </BaseButton>
        <BaseButton
          size="sm"
          variant="bordered"
          onPress={cancel}
          isDisabled={isSaving}
        >
          Cancel
        </BaseButton>
      </div>
    </div>
  );
};
