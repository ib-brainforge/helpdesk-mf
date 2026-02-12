import type { FC } from 'react';
import { BaseButton } from '@brainforgeau/components/button';
import { Icon } from '@brainforgeau/components/base';

interface InlineImageButtonProps {
  onInsertImage: () => void;
  disabled?: boolean;
}

// REVIEW: Placeholder for TipTap integration later
// This button will trigger image insertion into rich text editor
export const InlineImageButton: FC<InlineImageButtonProps> = ({
  onInsertImage,
  disabled = false,
}) => {
  return (
    <BaseButton
      size="sm"
      variant="light"
      onPress={onInsertImage}
      isDisabled={disabled}
      icon={<Icon name="photo" className="h-4 w-4" />}
    >
      Insert Image
    </BaseButton>
  );
};
