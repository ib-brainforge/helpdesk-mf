import { Chip } from '@heroui/react';
import type { WorkflowOwnerScope } from '../types/workflow';

interface ScopeBadgeProps {
  ownerScope: WorkflowOwnerScope;
}

export function ScopeBadge({ ownerScope }: ScopeBadgeProps) {
  if (ownerScope.startsWith('system:')) {
    return (
      <Chip color="default" size="sm">
        System
      </Chip>
    );
  }
  if (ownerScope.startsWith('tenant:')) {
    return (
      <Chip color="accent" size="sm">
        Tenant
      </Chip>
    );
  }
  return (
    <Chip color="default" size="sm">
      Unknown
    </Chip>
  );
}
