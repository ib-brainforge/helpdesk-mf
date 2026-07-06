import { HELPDESK_ROLES } from '@/types/admin-user';
import type { HelpdeskRole } from '@/types/admin-user';
import {
  BaseModal,
  BaseModalBody,
  BaseModalContent,
  BaseModalFooter,
  BaseModalHeader,
} from '@brainforgeau/components';
import { Icon } from '@brainforgeau/components/base';
import { BaseButton } from '@brainforgeau/components/button';
import { Chip, Spinner, toast } from '@heroui/react';
import {
  useAssignUserRole,
  useUnassignUserRole,
  useUserRoles,
} from '../hooks/useAdminUsers';

interface UserRolesModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}

const ROLE_DESCRIPTIONS: Record<HelpdeskRole, string> = {
  agent: 'Can view and manage tickets assigned to them',
  admin: 'Full administrative access to helpdesk settings',
  customer: 'Can submit and view their own tickets',
};

const ROLE_COLORS: Record<HelpdeskRole, 'accent' | 'warning' | 'default'> = {
  admin: 'warning',
  agent: 'accent',
  customer: 'default',
};

export function UserRolesModal({
  isOpen,
  onClose,
  userId,
  userName,
}: UserRolesModalProps) {
  const { data: roles, isLoading } = useUserRoles(isOpen ? userId : null);
  const assignMutation = useAssignUserRole();
  const unassignMutation = useUnassignUserRole();

  const currentRoles = new Set((roles ?? []).map(r => r.roleName));

  const handleToggle = async (role: HelpdeskRole) => {
    try {
      if (currentRoles.has(role)) {
        await unassignMutation.mutateAsync({ userId, roleName: role });
        toast('Role removed', {
          description: `Removed "${role}" from ${userName}`,
          variant: 'success',
        });
      } else {
        await assignMutation.mutateAsync({ userId, roleName: role });
        toast('Role assigned', {
          description: `Assigned "${role}" to ${userName}`,
          variant: 'success',
        });
      }
    } catch {
      toast('Error', {
        description: 'Failed to update role',
        variant: 'danger',
      });
    }
  };

  const isBusy = assignMutation.isPending || unassignMutation.isPending;

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} size="md">
      <BaseModalContent>
        <BaseModalHeader>Manage Helpdesk Roles — {userName}</BaseModalHeader>
        <BaseModalBody className="space-y-3">
          <p className="text-default-500 text-sm">
            These are helpdesk-specific roles. To manage Keycloak identity roles
            (login, SSO, application access), use the{' '}
            <span className="text-primary font-medium">
              Identity Administration
            </span>{' '}
            panel.
          </p>

          {isLoading ? (
            <div className="flex justify-center py-6">
              <Spinner size="md" />
            </div>
          ) : (
            <div className="space-y-2">
              {HELPDESK_ROLES.map(role => {
                const isAssigned = currentRoles.has(role);
                return (
                  <div
                    key={role}
                    className="border-light bg-default-50 flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Chip
                        size="sm"
                        color={ROLE_COLORS[role]}
                        variant={isAssigned ? 'primary' : 'tertiary'}
                      >
                        {role}
                      </Chip>
                      <p className="text-default-600 text-sm">
                        {ROLE_DESCRIPTIONS[role]}
                      </p>
                    </div>
                    <BaseButton
                      size="sm"
                      variant={isAssigned ? 'bordered' : 'light'}
                      color={isAssigned ? 'danger' : 'primary'}
                      isDisabled={isBusy}
                      onPress={() => handleToggle(role)}
                      icon={
                        isAssigned ? (
                          <Icon name="x-mark" className="h-3 w-3" />
                        ) : (
                          <Icon name="plus" className="h-3 w-3" />
                        )
                      }
                    >
                      {isAssigned ? 'Remove' : 'Assign'}
                    </BaseButton>
                  </div>
                );
              })}
            </div>
          )}
        </BaseModalBody>
        <BaseModalFooter>
          <BaseButton variant="bordered" onPress={onClose}>
            Close
          </BaseButton>
        </BaseModalFooter>
      </BaseModalContent>
    </BaseModal>
  );
}
