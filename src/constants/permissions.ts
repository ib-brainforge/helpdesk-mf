/**
 * Helpdesk permission names, exactly as they arrive in the context token.
 *
 * WHY THESE EXACT STRINGS
 * usePermissions() (@brainforgeau/security) flattens the token's
 * app_permissions into a list of names and checks them by exact string match.
 * For the helpdesk app those names are "tickets.read", "settings.manage" and so
 * on: the backend's HelpdeskPermissions constants minus the "helpdesk." prefix
 * (Helpdesk.Api/Constants/HelpdeskPermissions.cs), which is how identity
 * projects them into the token.
 *
 * These used to read 'Helpdesk.Ticket.Read', 'Helpdesk.Settings.Manage' and so
 * on, a form the token never carries. Every check therefore failed for a normal
 * user and passed only for elevated roles (multitenant.admin and friends skip
 * every check), so menus, buttons and pages a Technician or tenant Admin is
 * entitled to were hidden from them while looking fine to anyone testing as an
 * admin.
 *
 * The names are not app-prefixed, and the list usePermissions() checks is
 * flattened across every app in the token. Today the helpdesk context token
 * carries helpdesk and provider permissions, which do not overlap.
 */
export const HelpdeskPermissions = {
  Tickets: {
    Read: 'tickets.read',
    Create: 'tickets.create',
    Update: 'tickets.update',
    Delete: 'tickets.delete',
    Assign: 'tickets.assign',
    Merge: 'tickets.merge',
    Close: 'tickets.close',
    Moderate: 'tickets.moderate',
    Forward: 'tickets.forward',
  },
  Comments: {
    Read: 'comments.read',
    Create: 'comments.create',
    Manage: 'comments.manage',
  },
  KnowledgeBase: {
    Read: 'kb.read',
    Create: 'kb.create',
    Update: 'kb.update',
    Delete: 'kb.delete',
    Manage: 'kb.manage',
  },
  Categories: {
    Read: 'categories.read',
    Manage: 'categories.manage',
  },
  Reports: {
    Read: 'reports.read',
    Manage: 'reports.manage',
    Export: 'reports.export',
  },
  Users: {
    Read: 'users.read',
    Manage: 'users.manage',
  },
  Settings: {
    Read: 'settings.read',
    Manage: 'settings.manage',
  },
  Approvals: {
    Read: 'approvals.read',
    Decide: 'approvals.decide',
    Manage: 'approvals.manage',
    Request: 'approvals.request',
  },
  Satisfaction: {
    Read: 'satisfaction.read',
    Manage: 'satisfaction.manage',
  },
  Sla: {
    Manage: 'sla.manage',
  },
  Workflows: {
    Read: 'workflows.read',
    Manage: 'workflows.manage',
  },
  Automation: {
    Read: 'automation.read',
    Manage: 'automation.manage',
  },
  RuleGraphs: {
    Read: 'rulegraphs.read',
    Write: 'rulegraphs.write',
    Publish: 'rulegraphs.publish',
    Delete: 'rulegraphs.delete',
  },
  Provider: {
    /** Work the "From customers" queue in a provider's office. */
    Support: 'provider.support',
  },

  // The original flat keys, kept so existing call sites keep working. They
  // point at the same names as the groups above.
  TicketRead: 'tickets.read',
  /** Editing a ticket. The token has no "write"; the permission is update. */
  TicketWrite: 'tickets.update',
  TicketDelete: 'tickets.delete',
  TicketAssign: 'tickets.assign',
  ApprovalsRead: 'approvals.read',
  ApprovalsDecide: 'approvals.decide',
  ApprovalsManage: 'approvals.manage',
  ApprovalsRequest: 'approvals.request',
} as const;

type Leaves<T> = T extends string
  ? T
  : { [K in keyof T]: Leaves<T[K]> }[keyof T];

/** Any helpdesk permission name. */
export type HelpdeskPermission = Leaves<typeof HelpdeskPermissions>;
