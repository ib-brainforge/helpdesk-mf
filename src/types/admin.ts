/**
 * Admin-specific types for cross-tenant operations
 */

import type { TicketStatus, TicketPriority } from './ticket';

export interface PlatformTicketFilters {
  status?: TicketStatus[];
  priority?: TicketPriority[];
  categoryId?: string[];
  searchTerm?: string;
  mine?: boolean;
}

export interface TenantTicketFilters {
  status?: TicketStatus[];
  priority?: TicketPriority[];
  categoryId?: string[];
  searchTerm?: string;
}
