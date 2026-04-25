import { useState } from 'react';
import { Helmet } from '@modern-js/runtime/head';
import { Icon } from '@brainforgeau/components/base';
import { BaseButton } from '@brainforgeau/components/button';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Chip, Spinner, Link } from '@heroui/react';
import { useTenantUsers } from '@/components/admin-users/hooks/useAdminUsers';
import { useUsersData } from '@/components/users';
import { UserRolesModal } from '@/components/admin-users/components/UserRolesModal';
import type { TenantUserDto, HelpdeskRole } from '@/types/admin-user';
import { getAppConfig } from '@/state/config';

const ACTIVITY_ROLE_COLOR: Record<string, 'warning' | 'primary' | 'default'> = {
  admin: 'warning',
  agent: 'primary',
  customer: 'default',
};

function AdminUsersPage() {
  const [selectedUser, setSelectedUser] = useState<TenantUserDto | null>(null);
  const [isRolesModalOpen, setIsRolesModalOpen] = useState(false);

  const { tenantUsers, isLoading: isLoadingHelpdeskUsers } = useTenantUsers();
  const { items: identityUsers, isLoading: isLoadingIdentity } = useUsersData();

  const isLoading = isLoadingHelpdeskUsers || isLoadingIdentity;

  // Build a lookup map for identity display data by userId
  const identityMap = new Map(identityUsers.map((u) => [u.id, u]));

  const handleManageRoles = (user: TenantUserDto) => {
    setSelectedUser(user);
    setIsRolesModalOpen(true);
  };

  // Keycloak admin URL hint — from app config identityBaseUrl
  const config = getAppConfig();
  const keycloakAdminUrl = config.identityBaseUrl
    ? `${config.identityBaseUrl}/admin`
    : null;

  return (
    <>
      <Helmet>
        <title>Users — Helpdesk</title>
      </Helmet>

      <div className="mb-6">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Administration', href: '/admin/settings' },
            { label: 'Users', href: '/admin/users', isCurrent: true },
          ]}
        />
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-default-500 mt-1">
            Manage helpdesk roles for users known to this tenant
          </p>
        </div>
        {keycloakAdminUrl && (
          <Link href={keycloakAdminUrl} isExternal>
            <BaseButton
              variant="bordered"
              icon={<Icon name="arrow-top-right-on-square" className="h-4 w-4" />}
            >
              Identity Administration
            </BaseButton>
          </Link>
        )}
      </div>

      <div className="mb-4 p-4 bg-warning-50 border border-warning-200 rounded-lg">
        <div className="flex gap-2">
          <Icon name="information-circle" className="h-5 w-5 text-warning-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-warning-800">Helpdesk roles only</p>
            <p className="text-sm text-warning-700">
              This page manages helpdesk-specific roles (agent, admin, customer). To create, delete,
              or manage Keycloak login access for users, use the{' '}
              {keycloakAdminUrl ? (
                <Link href={keycloakAdminUrl} isExternal className="text-warning-800 underline">
                  Identity Administration
                </Link>
              ) : (
                'Identity Administration'
              )}{' '}
              panel.
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : tenantUsers.length === 0 ? (
        <div className="border rounded-lg p-12 text-center">
          <Icon name="users" className="h-12 w-12 text-default-300 mx-auto mb-3" />
          <p className="text-default-500 font-medium mb-1">No users yet</p>
          <p className="text-default-400 text-sm">
            Users appear here once they submit or are assigned to tickets
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-default-100 px-4 py-3 border-b">
            <h3 className="font-semibold text-sm">Tenant Users ({tenantUsers.length})</h3>
          </div>
          <div className="divide-y">
            {tenantUsers.map((user) => {
              const identity = identityMap.get(user.userId);
              const displayName = identity?.name ?? `User ${user.userId.slice(0, 8)}…`;
              const email = identity?.email;

              return (
                <div key={user.userId} className="px-4 py-3 flex items-center gap-3">
                  {/* Avatar placeholder */}
                  <div className="w-9 h-9 rounded-full bg-default-200 flex items-center justify-center flex-shrink-0">
                    <Icon name="user" className="h-4 w-4 text-default-500" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{displayName}</span>
                      <Chip
                        size="sm"
                        color={ACTIVITY_ROLE_COLOR[user.activityRole] ?? 'default'}
                        variant="flat"
                      >
                        {user.activityRole}
                      </Chip>
                      {user.assignedRoles.filter((r) => r !== user.activityRole).map((role) => (
                        <Chip key={role} size="sm" color="secondary" variant="bordered">
                          +{role}
                        </Chip>
                      ))}
                    </div>
                    <p className="text-xs text-default-400 mt-0.5">
                      {email && <span>{email} · </span>}
                      {user.submittedTicketCount} submitted · {user.assignedTicketCount} assigned
                    </p>
                  </div>

                  <BaseButton
                    size="sm"
                    variant="light"
                    onPress={() => handleManageRoles(user)}
                    icon={<Icon name="shield-check" className="h-4 w-4" />}
                  >
                    Roles
                  </BaseButton>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedUser && (
        <UserRolesModal
          isOpen={isRolesModalOpen}
          onClose={() => {
            setIsRolesModalOpen(false);
            setSelectedUser(null);
          }}
          userId={selectedUser.userId}
          userName={
            identityMap.get(selectedUser.userId)?.name ??
            `User ${selectedUser.userId.slice(0, 8)}…`
          }
        />
      )}
    </>
  );
}

export default AdminUsersPage;
