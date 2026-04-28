import { Chip } from '@heroui/react';
import { VersionStatus } from '../types/enums';

const COLORS = {
  [VersionStatus.Draft]: 'warning',
  [VersionStatus.Published]: 'success',
  [VersionStatus.Archived]: 'default',
} as const;

const LABELS = {
  [VersionStatus.Draft]: 'Draft',
  [VersionStatus.Published]: 'Published',
  [VersionStatus.Archived]: 'Archived',
};

export function VersionBadge({ status }: { status: VersionStatus }) {
  return (
    <Chip color={COLORS[status]} variant="flat" size="sm">
      {LABELS[status]}
    </Chip>
  );
}
