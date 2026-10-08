import type { UserInfo } from '@/hooks/useUserEnrichment';
import { BaseAvatar } from '@brainforgeau/components';
import { useLayoutEffect, useRef, useState } from 'react';

interface UserCellProps {
  userInfo?: UserInfo | null;
  /**
   * Name carried on the ticket itself, used when enrichment has not resolved.
   * Nullable because the API returns null for it, and forcing every call site
   * to launder that into undefined is how the `?? 'Assigned'` stand-ins got
   * there in the first place.
   */
  fallbackName?: string | null;
  /** Off for columns that list a person as plain text (Requester). */
  showAvatar?: boolean;
}

/**
 * Shared canvas for text measurement.
 *
 * One per document rather than one per cell: a grid renders 50 of these (25
 * rows across Assignee and Requester), and measuring on a canvas rather than
 * in the DOM avoids a layout pass per candidate string.
 */
let measureCtx: CanvasRenderingContext2D | null = null;
const getMeasureCtx = () => {
  if (typeof document === 'undefined') return null;
  if (!measureCtx) {
    measureCtx = document.createElement('canvas').getContext('2d');
  }
  return measureCtx;
};

/** Memoised widths: the same handful of names recur on every row. */
const widthCache = new Map<string, number>();
const textWidth = (text: string, font: string): number => {
  const key = `${font}|${text}`;
  const hit = widthCache.get(key);
  if (hit !== undefined) return hit;
  const ctx = getMeasureCtx();
  if (!ctx) return 0;
  ctx.font = font;
  const width = ctx.measureText(text).width;
  widthCache.set(key, width);
  return width;
};

/** "Alexandra Konstantinopoulos" -> "Alexandra K." */
const abbreviate = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name;
  const last = parts[parts.length - 1];
  return `${parts[0]} ${last.charAt(0).toUpperCase()}.`;
};

/**
 * A person in a table cell: avatar plus the longest form of their name that
 * actually fits.
 *
 * WHY ADAPTIVE
 * Below a 1920px viewport this column gives the name about 95px, roughly seven
 * wide characters, so real names ("Kim TenantTest", "Zeljko Mitrovic") clipped
 * to an ellipsis. A column of "Kim Tenant..." is neither readable nor
 * scannable, and the hover title carrying the full value is no use on touch.
 *
 * The name is therefore measured against the space available and rendered as:
 *   1. the full name, whenever it fits
 *   2. otherwise "First L.", which needs about 60px
 *   3. otherwise clipped, the last resort for one very long unbroken word
 *
 * The result is a column with no ellipses at any normal width, that still
 * shows full names whenever there is room.
 *
 * UNRESOLVED USERS
 * Rendered whenever the ticket carries a user id, which is not the same as
 * that user being resolvable: identity lookup returns nothing for ids that no
 * longer exist (a deleted account, an import, seeded data). This used to
 * render a caller-supplied literal like "Assigned" as if it were the person's
 * name, avatar initials and all, so a lookup failure read as data. It is now
 * stated plainly, in muted text with no avatar.
 *
 * The email used to sit on a second line. In this width both lines clipped,
 * and "kim-tenant..." is not something anyone can act on, so it moved into the
 * hover title where it is complete rather than cut off.
 */
export const UserCell: React.FC<UserCellProps> = ({
  userInfo,
  fallbackName,
  showAvatar = true,
}) => {
  const displayName = userInfo?.name ?? fallbackName;
  const email = userInfo?.email;

  const rowRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState<string | null>(null);

  useLayoutEffect(() => {
    const row = rowRef.current;
    const el = nameRef.current;
    if (!row || !el || !displayName) return undefined;

    const fit = () => {
      /*
       * Measure the ROW, not the span.
       *
       * The span is a shrink-to-fit flex item, so its clientWidth is the width
       * of the text currently in it, not the width on offer. Measuring that
       * made the decision self-fulfilling: once a name was abbreviated the box
       * shrank to the short form, so the full name could never be found to fit
       * again, and short names like "Eric Isik" were abbreviated in a column
       * with 116px to spare.
       *
       * The row's content box minus the avatar and the gap is the real budget.
       */
      const rowStyle = getComputedStyle(row);
      const avatar = showAvatar
        ? (row.firstElementChild as HTMLElement | null)
        : null;
      const available =
        row.clientWidth -
        (avatar?.offsetWidth ?? 0) -
        (Number.parseFloat(rowStyle.columnGap) || 0);
      if (available <= 0) return;

      const style = getComputedStyle(el);
      const font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;

      setShown(
        textWidth(displayName, font) <= available
          ? displayName
          : abbreviate(displayName),
      );
    };

    fit();
    // Observing the row is also what keeps this stable: its width is driven by
    // the column, which does not change when the text inside does.
    const observer = new ResizeObserver(fit);
    observer.observe(row);
    return () => observer.disconnect();
  }, [displayName, showAvatar]);

  if (!displayName) {
    return (
      <span
        className="text-muted-foreground text-sm italic"
        title="This user could not be found in the directory"
      >
        Unknown user
      </span>
    );
  }

  return (
    <div ref={rowRef} className="flex min-w-0 items-center gap-2">
      {showAvatar && (
        <BaseAvatar
          src={userInfo?.avatarUrl}
          name={displayName}
          size="sm"
          className="flex-shrink-0"
        />
      )}
      {/*
        min-w-0 is what lets this shrink at all: a flex child defaults to
        min-width:auto, so without it a long name pushes out of the cell and
        over the next column instead of being measured against it.

        The title always carries the full name and email, abbreviated or not.
      */}
      <span
        ref={nameRef}
        className="text-foreground min-w-0 truncate text-sm font-medium"
        title={email ? `${displayName} (${email})` : displayName}
      >
        {shown ?? displayName}
      </span>
    </div>
  );
};
