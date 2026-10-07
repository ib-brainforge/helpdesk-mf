// Re-export types from generated client
export {
  type HelpdeskApplicationTicketsDTOsTicketListDto,
  type HelpdeskApplicationTicketsDTOsTicketDto,
  type HelpdeskApplicationCommonPagedResultTicketListDto,
  type HelpdeskApplicationTicketsCommandsCreateTicketCreateTicketCommand,
  type HelpdeskApplicationTicketsCommandsUpdateTicketUpdateTicketCommand,
  HelpdeskDomainTicketsEnumsTicketStatus,
  HelpdeskDomainTicketsEnumsTicketPriority,
  HelpdeskDomainTicketsEnumsTicketOrigin,
} from '@brainforgeau/helpdesk-client';

// Keep local enum aliases for easier use in the UI
import {
  HelpdeskDomainTicketsEnumsTicketOrigin,
  HelpdeskDomainTicketsEnumsTicketPriority,
  HelpdeskDomainTicketsEnumsTicketStatus,
} from '@brainforgeau/helpdesk-client';

export enum TicketStatus {
  New = 'New',
  InProgress = 'InProgress',
  Closed = 'Closed',
}

export enum TicketPriority {
  None = 'None',
  Low = 'Low',
  Normal = 'Normal',
  High = 'High',
  Critical = 'Critical',
}

export enum TicketOrigin {
  Web = 'Web',
  Email = 'Email',
  Api = 'Api',
}

// Local type aliases for convenience (maps from generated types)
import type {
  HelpdeskApplicationCommonPagedResultTicketListDto as GeneratedPagedResult,
  HelpdeskApplicationTicketsDTOsTicketDto as GeneratedTicketDto,
  HelpdeskApplicationTicketsDTOsTicketListDto as GeneratedTicketListDto,
} from '@brainforgeau/helpdesk-client';

export type TicketListDto = GeneratedTicketListDto & {
  // requesterName / assigneeName are now provided natively by the generated
  // client; categoryName remains a UI-only enrichment field.
  categoryName?: string;
};

export type TicketDto = GeneratedTicketDto & {
  // requesterName / assigneeName / isProblem / isPublishedAsIdea /
  // publishedAsIdeaAt are now provided natively by the generated client.
  // categoryName remains a UI-only enrichment field.
  categoryName?: string;
  customFields?: CustomFieldValueDto[];
  // TODO: Remove these when helpdesk-backend-client exposes isDeleted and isSpam in TicketDto
  isDeleted?: boolean;
  isSpam?: boolean;
};

export interface CustomFieldValueDto {
  fieldId: string;
  fieldName?: string;
  value: string;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface TicketFilters {
  status?: string[]; // API takes single value, but UI may filter multiple
  priority?: string[];
  categoryId?: string[];
  assigneeId?: string[];
  searchTerm?: string;
  /**
   * People and places whose NAME matched searchTerm, resolved on this side
   * because the names live in identity-management (see useSearchMatches).
   * Never set by the user; derived from searchTerm just before querying.
   */
  searchUserIds?: string[];
  searchScopeIds?: string[];
  tagIds?: string[]; // Filter by tag IDs
  unassignedOnly?: boolean;
  /** When true, only tickets past their due date are returned (backend OverdueOnly param). */
  overdueOnly?: boolean;
  /**
   * Custom (tenant-defined) statuses to include, sent as repeated
   * `customStatusIds=`. Matched together with `status` as "any of": ticking
   * New and a custom status lists tickets in either, not only those in both.
   */
  customStatusIds?: string[];
  /*
   * Scope narrowing, for a service admin whose rows span tenants.
   *
   * Ignored on the tenant-scoped endpoint, which already answers for exactly
   * one tenant and one organisation, so there is nothing for these to narrow.
   */
  tenantId?: string;
  organisationId?: string;
  divisionId?: string;
}

export interface CreateTicketDto {
  subject: string;
  description: string;
  priority: string;
  categoryId?: string;
  assigneeId?: string;
  tags?: string[];
}

export interface UpdateTicketDto {
  subject?: string;
  description?: string;
  status?: string;
  /**
   * Tenant-defined status, sent alongside `status` on the same status patch.
   *
   * A custom status does not replace the system status, it refines it: the
   * ticket still has to be New, In Progress or Closed for every count, filter
   * and SLA rule in the product to keep working, so a custom status carries a
   * `mapsToStatus` and the caller sends both.
   *
   * `null` clears it. That matters: picking a plain built-in status has to
   * detach whatever custom status was set, and omitting the field would leave
   * it attached.
   */
  customStatusId?: string | null;
  priority?: string;
  categoryId?: string;
  /**
   * `null` unassigns; `undefined` leaves the assignee untouched.
   *
   * The distinction is load-bearing. This was plain `string | undefined`, so
   * clearing the field produced `undefined`, the mutation's `if (updates
   * .assigneeId)` guard read it as "no change", and no request was sent at
   * all. The clear button looked like it worked until the page refreshed.
   */
  assigneeId?: string | null;
  tags?: string[];
}
