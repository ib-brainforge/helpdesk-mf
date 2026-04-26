// Local DTO projections used by hooks; the AdminUsersApi is now published in helpdesk-client.
// Keeping local copies to keep the hook layer decoupled from the generated long type names.

export interface TenantUserDto {
  userId: string;
  activityRole: 'agent' | 'admin' | 'customer';
  assignedRoles: string[];
  submittedTicketCount: number;
  assignedTicketCount: number;
}

export interface UserRoleDto {
  id: string;
  userId: string;
  roleName: string;
  createdAt: string;
}

export type HelpdeskRole = 'agent' | 'admin' | 'customer';

export const HELPDESK_ROLES: HelpdeskRole[] = ['agent', 'admin', 'customer'];
