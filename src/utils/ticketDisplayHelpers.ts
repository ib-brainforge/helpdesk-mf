/**
 * Shared display helpers for ticket status and priority badges
 *
 * Phase 2: Frontend Unification
 * Extracted from platform-ticket-columns.tsx and ticket-grid-columns.tsx to avoid duplication
 */

export type BadgeColor = 'primary' | 'warning' | 'success' | 'danger' | 'default';

export interface StatusConfig {
  label: string;
  color: BadgeColor;
}

/**
 * Get display configuration for ticket status
 * Works for both regular and platform tickets (enum values are aligned)
 */
export const getStatusConfig = (status?: string): StatusConfig => {
  if (!status) {
    return { label: 'Unknown', color: 'default' };
  }

  switch (status) {
    // Regular tickets: New, InProgress, Closed
    case 'New':
      return { label: 'New', color: 'primary' };
    case 'InProgress':
      return { label: 'In Progress', color: 'warning' };
    case 'Closed':
      return { label: 'Closed', color: 'success' };

    // Platform tickets: Open, InProgress, Resolved, Closed
    case 'Open':
      return { label: 'Open', color: 'primary' };
    case 'Resolved':
      return { label: 'Resolved', color: 'success' };

    default:
      return { label: status, color: 'default' };
  }
};

/**
 * Get display configuration for ticket priority
 * Works for both regular and platform tickets (enum values are aligned)
 */
export const getPriorityConfig = (priority?: string): StatusConfig => {
  if (!priority) {
    return { label: 'None', color: 'default' };
  }

  switch (priority) {
    case 'Critical':
      return { label: 'Critical', color: 'danger' };
    case 'High':
      return { label: 'High', color: 'warning' };

    // Regular tickets have 'Normal', platform has 'Medium'
    case 'Normal':
    case 'Medium':
      return { label: priority, color: 'primary' };

    case 'Low':
      return { label: 'Low', color: 'default' };

    case 'None':
      return { label: 'None', color: 'default' };

    default:
      return { label: priority, color: 'default' };
  }
};
