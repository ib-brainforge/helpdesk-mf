import type { ReactNode } from 'react';

export type BadgeColor =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'secondary';

/*
 * `danger` was `bg-danger`, which emits no CSS.
 *
 * `--color-danger` does exist, but only as a runtime alias in `:root`
 * (`--color-danger: var(--danger)`), not as a registered Tailwind theme
 * colour, so no `.bg-danger` utility is ever generated. The badge kept its
 * `text-white` and got a transparent background, which on a white row meant
 * every Critical priority rendered as an empty cell. Nothing failed loudly:
 * the text was present and `visibility: visible` the whole time.
 *
 * `--color-red-dark` (#ae2e24) is a real hue token in the same family as the
 * `bg-green` used above, and carries white text at roughly 6.5:1 rather than
 * the ~3:1 of the lighter `--color-red`, which matters for the one badge that
 * means "drop everything".
 */
const colorClasses: Record<BadgeColor, string> = {
  default: 'bg-slate-500',
  primary: 'bg-sky-500',
  // The theme's own --color-green (#6a9a23), chosen deliberately over a darker
  // step. White text on it is 3.35:1, below the 4.5:1 AA wants for this 12px
  // bold label, so the label leans on brevity and column position as much as
  // the text itself. Going darker (lime-700, 4.99:1) reads too heavy for a
  // colour that now marks the two most common values on the board.
  success: 'bg-green',
  warning: 'bg-amber-500',
  danger: 'bg-red-dark',
  secondary: 'bg-purple-500',
};

interface StatusBadgeProps {
  color?: BadgeColor;
  children: ReactNode;
}

export const StatusBadge = ({
  color = 'default',
  children,
}: StatusBadgeProps) => (
  <div
    className={`rounded-xs inline-flex items-center gap-1 whitespace-nowrap px-2.5 py-0 text-xs font-semibold text-white ${colorClasses[color]}`}
  >
    {children}
  </div>
);

/**
 * The same hues as a solid swatch, for dots and bars.
 *
 * Exported so a picker can colour-code its options with the exact colour the
 * badge would have used, rather than a second palette that drifts from this one.
 */
export const badgeSwatchClasses: Record<BadgeColor, string> = colorClasses;

/**
 * Status/priority colour applied to a form control rather than a badge.
 *
 * A solid fill works on a 12px badge and is far too loud on a full-width
 * select, where it would also fight the chevron for contrast. This keeps the
 * field reading as a control: a left accent bar carries the colour, and a 5%
 * wash of the same hue tints the field enough to be seen at a glance without
 * touching the legibility of the value.
 *
 * The accent is deliberately the heavier signal. It survives dark mode, where
 * a light wash all but disappears, so the colour is never carried by the tint
 * alone.
 */
export const badgeFieldClasses: Record<BadgeColor, string> = {
  default: 'border-l-4 border-l-slate-500 bg-slate-500/5',
  primary: 'border-l-4 border-l-sky-500 bg-sky-500/5',
  success: 'border-l-4 border-l-green bg-green/5',
  warning: 'border-l-4 border-l-amber-500 bg-amber-500/5',
  danger: 'border-l-4 border-l-red-dark bg-red-dark/5',
  secondary: 'border-l-4 border-l-purple-500 bg-purple-500/5',
};
