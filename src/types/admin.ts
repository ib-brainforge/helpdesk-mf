/**
 * Admin-specific types for cross-tenant operations
 */

// Platform ticket types matching backend PlatformTicketListDto
export interface PlatformTicketListItem {
  id: string;
  subject: string;
  submitterUserId: string;
  submitterTenantId: string;
  submitterTenantName: string;
  submitterEmail: string;
  status: PlatformTicketStatus;
  priority: PlatformTicketPriority;
  categoryId?: string;
  categoryName?: string;
  assigneeId?: string;
  createdAt: string;
  updatedAt: string;
}

export type PlatformTicketStatus = 'Open' | 'InProgress' | 'Resolved' | 'Closed';
export type PlatformTicketPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface PlatformTicketFilters {
  status?: PlatformTicketStatus;
  priority?: PlatformTicketPriority;
  categoryId?: string;
  searchTerm?: string;
  mine?: boolean;
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
