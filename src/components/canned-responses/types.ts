import type { CannedResponseDto } from '@/types/canned-response';

export type { CannedResponseDto };

export interface CannedResponsePickerProps {
  onSelect: (response: CannedResponseDto) => void;
  categoryId?: string;
}
