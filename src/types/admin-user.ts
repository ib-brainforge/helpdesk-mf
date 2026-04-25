// REVIEW: Using local types until @brainforgeau/helpdesk-client is updated with Wave 7.2 endpoints (backend PR #60).

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
