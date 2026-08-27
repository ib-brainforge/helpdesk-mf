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
