import { Icon } from '@brainforgeau/components';
import { Card, CardBody, Skeleton } from '@heroui/react';
import { memo } from 'react';

export type SummaryCardVariant = 'default' | 'success' | 'danger' | 'warning' | 'info';

interface SummaryCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  variant?: SummaryCardVariant;
  isLoading?: boolean;
}

const variantStyles: Record<SummaryCardVariant, { accent: string; iconBg: string }> = {
  default: {
    accent: 'bg-indigo-500',
    iconBg: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  },
  success: {
    accent: 'bg-emerald-500',
    iconBg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  danger: {
    accent: 'bg-rose-500',
    iconBg: 'bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  },
  warning: {
    accent: 'bg-amber-500',
    iconBg: 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  },
  info: {
    accent: 'bg-sky-500',
    iconBg: 'bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  },
};

export const SummaryCard = memo<SummaryCardProps>(
  ({ title, value, subtitle, icon, variant = 'default', isLoading }) => {
    const styles = variantStyles[variant];

    return (
      <Card className="relative overflow-hidden rounded-[4px] border border-default-200 bg-white shadow-[0_1px_0_rgba(9,30,66,0.08)] dark:border-default-100 dark:bg-default-50/60">
        <div className={`absolute inset-x-0 top-0 h-1 ${styles.accent}`} />
        <CardBody className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-wide text-default-600">
                {title}
              </span>
              {isLoading ? (
                <Skeleton className="mt-1 h-7 w-16 rounded-md" />
              ) : (
                <span className="text-2xl font-semibold text-foreground">{value}</span>
              )}
              {subtitle && (
                <span className="text-xs text-default-600">{subtitle}</span>
              )}
            </div>
            {icon && (
              <div className={`rounded-[4px] p-2 ${styles.iconBg}`}>
                <Icon name={icon} className="h-5 w-5" />
              </div>
            )}
          </div>
        </CardBody>
      </Card>
    );
  }
);

SummaryCard.displayName = 'SummaryCard';
