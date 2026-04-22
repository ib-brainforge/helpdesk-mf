import { Chip } from '@heroui/react';
import type { WorkflowOwnerScope } from '../types/workflow';

interface ScopeBadgeProps {
  ownerScope: WorkflowOwnerScope;
}

export function ScopeBadge({ ownerScope }: ScopeBadgeProps) {
  if (ownerScope.startsWith('system:')) {
    return (
      <Chip color="default" variant="flat" size="sm">
        System
      </Chip>
    );
  }
  if (ownerScope.startsWith('tenant:')) {
    return (
      <Chip color="primary" variant="flat" size="sm">
        Tenant
      </Chip>
    );
  }
  if (ownerScope.startsWith('principal:')) {
    return (
      <Chip color="secondary" variant="flat" size="sm">
        Principal
      </Chip>
    );
  }
  return (
    <Chip color="default" variant="flat" size="sm">
      Unknown
    </Chip>
  );
}
