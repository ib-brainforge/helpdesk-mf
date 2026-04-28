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
  | typeof HelpdeskPermissions.Settings[keyof typeof HelpdeskPermissions.Settings]
  | typeof HelpdeskPermissions.TicketRead
  | typeof HelpdeskPermissions.TicketWrite
  | typeof HelpdeskPermissions.TicketDelete
  | typeof HelpdeskPermissions.TicketAssign
  | typeof HelpdeskPermissions.ApprovalsRead
  | typeof HelpdeskPermissions.ApprovalsDecide
  | typeof HelpdeskPermissions.ApprovalsManage
  | typeof HelpdeskPermissions.ApprovalsRequest;
