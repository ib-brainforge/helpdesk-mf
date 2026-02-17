/**
 * Unified ticket types for regular, platform, and tenant ticket views
 *
 * Phase 2: Frontend Unification
 * Provides a single abstraction over different ticket sources with capability-based feature toggling.
 */

export type TicketSource = 'regular' | 'platform' | 'tenant';

/**
 * Unified ticket list item - superset of all ticket DTO fields
 * Combines fields from TicketListDto + PlatformTicketListDto
 */
export interface UnifiedTicketListItem {
  // Common fields (present in both)
  id?: string;
  subject?: string;
  status?: string; // Can be TicketStatus or PlatformTicketStatus (enums aligned)
  priority?: string; // Can be TicketPriority or PlatformTicketPriority (enums aligned)
  categoryId?: string | null;
  categoryName?: string | null;
  origin?: string; // TicketOrigin enum
  requesterId?: string;
  assigneeId?: string | null;
  dueDate?: string | null;
  unreadForAgent?: boolean;
  unreadForRequester?: boolean;
  createdAt?: string;
  modifiedAt?: string; // Aligned field name

  // Platform-specific fields
  submitterEmail?: string;
  submitterTenantId?: string;
  submitterTenantName?: string;
}

/**
 * Unified ticket detail - superset of all ticket detail DTO fields
 * Combines fields from TicketDto + PlatformTicketDto
 */
export interface UnifiedTicketDetail {
  // Common fields
  id?: string;
  subject?: string;
  description?: string | null; // Aligned field name
  status?: string;
  customStatusId?: string | null;
  priority?: string;
  categoryId?: string | null;
  categoryName?: string | null;
  origin?: string;
  requesterId?: string;
  assigneeId?: string | null;
  onBehalfOfUserId?: string | null;
  dueDate?: string | null;
  startedAtUtc?: string | null;
  resolvedAtUtc?: string | null;
  closedAtUtc?: string | null;
  timeSpent?: string;
  unreadForAgent?: boolean;
  unreadForRequester?: boolean;
  referrerUrl?: string | null;
  tags?: string[];
  subscriberIds?: string[];
  createdAt?: string;
  modifiedAt?: string; // Aligned field name

  // Platform-specific fields
  submitterEmail?: string;
  submitterTenantId?: string;
  submitterTenantName?: string;

  // Comments from platform tickets (regular tickets fetch comments separately)
  comments?: Array<{
    id?: string;
    ticketId?: string;
    authorId?: string | null;
    body?: string;
    commentType?: string;
    createdAt?: string;
    authorEmail?: string;
  }>;
}

/**
 * Feature capabilities per ticket source
 * Controls which UI features are available for each ticket type
 */
export interface TicketSourceCapabilities {
  // Core operations
  canEdit: boolean;
  canDelete: boolean;
  canChangePriority: boolean;
  canChangeCategory: boolean;
  canAssign: boolean;

  // Advanced features
  canMerge: boolean;
  canLink: boolean;
  hasAttachments: boolean;
  hasSla: boolean;
  hasTimeTracking: boolean;
  hasApprovals: boolean;
  hasCsat: boolean;
  hasAiAssistant: boolean;
  hasRealTimeUpdates: boolean;
}

/**
 * Capability matrix by ticket source
 *
 * - regular: Full feature set (all true)
 * - platform: Subset of features (grows over time as features are implemented)
 * - tenant: Read-only view for admins (all false except viewing)
 */
export const SOURCE_CAPABILITIES: Record<TicketSource, TicketSourceCapabilities> = {
  regular: {
    canEdit: true,
    canDelete: true,
    canChangePriority: true,
    canChangeCategory: true,
    canAssign: true,
    canMerge: true,
    canLink: true,
    hasAttachments: true,
    hasSla: true,
    hasTimeTracking: true,
    hasApprovals: true,
    hasCsat: true,
    hasAiAssistant: true,
    hasRealTimeUpdates: true,
  },
  platform: {
    canEdit: true, // Content editing available
    canDelete: false, // Not yet implemented
    canChangePriority: true,
    canChangeCategory: true,
    canAssign: true,
    canMerge: false, // Not yet implemented
    canLink: false, // Not yet implemented
    hasAttachments: false, // Not yet implemented
    hasSla: false, // Future feature
    hasTimeTracking: false, // Future feature
    hasApprovals: false, // Future feature
    hasCsat: false, // Future feature
    hasAiAssistant: false, // Future feature
    hasRealTimeUpdates: false, // Future feature
  },
  tenant: {
    // Read-only view for cross-tenant admin access
    canEdit: false,
    canDelete: false,
    canChangePriority: false,
    canChangeCategory: false,
    canAssign: false,
    canMerge: false,
    canLink: false,
    hasAttachments: false,
    hasSla: false,
    hasTimeTracking: false,
    hasApprovals: false,
    hasCsat: false,
    hasAiAssistant: false,
    hasRealTimeUpdates: false,
  },
};
