import { BaseCard, Icon } from '@brainforgeau/components';
import { Card, CardContent, Skeleton } from '@heroui/react';
import { memo } from 'react';

export type SummaryCardVariant =
  | 'default'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info';

interface SummaryCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  variant?: SummaryCardVariant;
  isLoading?: boolean;
}

const variantStyles: Record<
  SummaryCardVariant,
  { accent: string; iconBg: string }
> = {
  default: {
    accent: 'bg-blue',
    iconBg: 'bg-blue-100 text-blue-700',
  },
  success: {
    accent: 'bg-green',
    iconBg: 'bg-green-100 text-green',
  },
  danger: {
    accent: 'bg-red-600',
    iconBg: 'bg-red-100 text-red-700',
  },
  warning: {
    accent: 'bg-yellow',
    iconBg: 'bg-yellow-soft text-yellow',
  },
  info: {
    accent: 'bg-blue',
    iconBg: 'bg-blue-100 text-blue-700',
  },
};

export const SummaryCard = memo<SummaryCardProps>(
  ({ title, value, subtitle, icon, variant = 'default', isLoading }) => {
    const styles = variantStyles[variant];

    return (
      <BaseCard>
        <div className={`absolute inset-x-0 top-0 h-1 ${styles.accent}`} />
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col">
            <strong className="text-gray text-xs font-semibold uppercase tracking-wide">
              {title}
            </strong>
            {isLoading ? (
              <Skeleton className="mt-1 h-7 w-16 rounded-md" />
            ) : (
              <span className="text-foreground text-2xl font-semibold">
                {value}
              </span>
            )}
            {subtitle && <span className="text-gray text-xs">{subtitle}</span>}
          </div>
          {icon && (
            <div className={`rounded-[3px] p-2 ${styles.iconBg}`}>
              <Icon name={icon} className="h-5 w-5" />
            </div>
          )}
        </div>
      </BaseCard>
    );
  },
);

SummaryCard.displayName = 'SummaryCard';
