/**
 * Admin-specific types for cross-tenant operations
 */

// Platform ticket types matching backend PlatformTicketListDto
// Phase 2: Updated to match aligned field names (requesterId, modifiedAt)
// Using optional fields to match generated client types
export interface PlatformTicketListItem {
  id?: string;
  subject?: string;
  requesterId?: string; // Phase 2: Aligned with regular tickets (was submitterUserId)
  submitterTenantId?: string;
  submitterTenantName?: string;
  submitterEmail?: string;
  status?: PlatformTicketStatus;
  priority?: PlatformTicketPriority;
  categoryId?: string | null;
  categoryName?: string | null;
  assigneeId?: string | null;
  createdAt?: string;
  modifiedAt?: string; // Phase 2: Aligned with regular tickets (was updatedAt)
}

export type PlatformTicketStatus = 'New' | 'InProgress' | 'Closed';
export type PlatformTicketPriority = 'None' | 'Low' | 'Normal' | 'High' | 'Critical';

export interface PlatformTicketFilters {
  status?: PlatformTicketStatus;
  priority?: PlatformTicketPriority;
  categoryId?: string;
  searchTerm?: string;
  mine?: boolean;
}

// Platform ticket detail (single ticket with comments)
// Phase 2: Updated to match aligned field names (requesterId, description, modifiedAt)
export interface PlatformTicketDetail {
  id: string;
  requesterId: string; // Phase 2: Aligned with regular tickets (was submitterUserId)
  submitterTenantId: string;
  submitterTenantName: string;
  submitterEmail: string;
  subject: string;
  description: string; // Phase 2: Aligned with regular tickets (was body)
  status: PlatformTicketStatus;
  priority: PlatformTicketPriority;
  categoryId?: string;
  categoryName?: string;
  assigneeId?: string;
  createdAt: string;
  modifiedAt: string; // Phase 2: Aligned with regular tickets (was updatedAt)
  comments: PlatformTicketComment[];
}

// Phase 2: Updated to match aligned field names
export interface PlatformTicketComment {
  id: string;
  ticketId: string;
  authorId: string;
  authorEmail: string;
  body: string;
  commentType: string;
  idempotencyKey?: string | null;
  createdAt: string;
}

export interface TenantTicketFilters {
  status?: string;
  priority?: string;
  categoryId?: string;
  searchTerm?: string;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
