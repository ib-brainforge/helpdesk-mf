/**
 * Permission constants for the Helpdesk domain
 */

export const HelpdeskPermissions = {
  Settings: {
    Read: 'Helpdesk.Settings.Read',
    Manage: 'Helpdesk.Settings.Manage',
  },
} as const;

export type HelpdeskPermission = typeof HelpdeskPermissions.Settings[keyof typeof HelpdeskPermissions.Settings];
