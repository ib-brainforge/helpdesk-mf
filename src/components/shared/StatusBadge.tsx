import type { ReactNode } from 'react';

export type BadgeColor = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'secondary';

const colorClasses: Record<BadgeColor, string> = {
  default: 'bg-slate-500',
  primary: 'bg-sky-500',
  success: 'bg-green',
  warning: 'bg-amber-500',
  danger: 'bg-red-700',
  secondary: 'bg-purple-500',
};

interface StatusBadgeProps {
  color?: BadgeColor;
  children: ReactNode;
}

export const StatusBadge = ({ color = 'default', children }: StatusBadgeProps) => (
  <div
    className={`rounded-xs inline-flex items-center gap-1 whitespace-nowrap px-2.5 py-0 text-xs font-semibold text-white ${colorClasses[color]}`}
  >
    {children}
  </div>
);
