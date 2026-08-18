/**
 * Permission constants for the Helpdesk domain
 */

export const HelpdeskPermissions = {
  Settings: {
    Read: 'Helpdesk.Settings.Read',
    Manage: 'Helpdesk.Settings.Manage',
  },
  TicketRead: 'Helpdesk.Ticket.Read',
  TicketWrite: 'Helpdesk.Ticket.Write',
  TicketDelete: 'Helpdesk.Ticket.Delete',
  TicketAssign: 'Helpdesk.Ticket.Assign',
  ApprovalsRead: 'Helpdesk.Approvals.Read',
  ApprovalsDecide: 'Helpdesk.Approvals.Decide',
  ApprovalsManage: 'Helpdesk.Approvals.Manage',
  ApprovalsRequest: 'Helpdesk.Approvals.Request',
} as const;

export type HelpdeskPermission =
  | (typeof HelpdeskPermissions.Settings)[keyof typeof HelpdeskPermissions.Settings]
  | typeof HelpdeskPermissions.TicketRead
  | typeof HelpdeskPermissions.TicketWrite
  | typeof HelpdeskPermissions.TicketDelete
  | typeof HelpdeskPermissions.TicketAssign
  | typeof HelpdeskPermissions.ApprovalsRead
  | typeof HelpdeskPermissions.ApprovalsDecide
  | typeof HelpdeskPermissions.ApprovalsManage
  | typeof HelpdeskPermissions.ApprovalsRequest;

/**
 * Scope/placement permission -- fleet-wide, NOT namespaced under
 * `Helpdesk.*` like the permissions above. Matches
 * `Services.Core.Abstractions.Constants.Roles.ScopeManage` (`"scope.manage"`)
 * verbatim, the same string asset-mf's/hr-mf's `ScopePermissions.Manage`
 * already use -- `Services.Core.Scope`'s `ScopeController`/`ScopeChangeGuard`
 * check this identical role name in every service that mounts the scope
 * endpoints, helpdesk-backend included.
 */
export const ScopePermissions = {
  Manage: 'scope.manage',
} as const;
