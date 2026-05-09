import type { FC } from 'react';
import { Icon } from '@brainforgeau/components/base';

interface TagChipProps {
  name: string;
  color?: string;
  onRemove?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES: Record<NonNullable<TagChipProps['size']>, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1 text-sm',
};

export const TagChip: FC<TagChipProps> = ({
  name,
  color,
  onRemove,
  size = 'sm',
}) => {
  const sizeClass = SIZE_CLASSES[size];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClass} ${!color ? 'bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300' : ''}`}
      style={color ? { backgroundColor: color, color: '#fff' } : undefined}
    >
      {name}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center rounded-full hover:opacity-70"
          aria-label={`Remove tag ${name}`}
        >
          <Icon name="x-mark" className="h-3 w-3" />
        </button>
      )}
    </span>
  );
};
