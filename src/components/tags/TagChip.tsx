import type { FC } from 'react';
import { Chip } from '@heroui/react';
import { Icon } from '@brainforgeau/components/base';

interface TagChipProps {
  name: string;
  color?: string;
  onRemove?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export const TagChip: FC<TagChipProps> = ({
  name,
  color,
  onRemove,
  size = 'sm',
}) => {
  return (
    <Chip
      size={size}
      variant="flat"
      color={color ? undefined : 'primary'}
      style={color ? { backgroundColor: color, color: '#fff' } : undefined}
      onClose={onRemove}
      endContent={
        onRemove ? (
          <Icon name="x-mark" className="h-3 w-3 cursor-pointer" onClick={onRemove} />
        ) : undefined
      }
    >
      {name}
    </Chip>
  );
};
