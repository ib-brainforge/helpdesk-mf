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
  // Add any UI-specific fields if needed
  categoryName?: string;
  assigneeName?: string;
  requesterName?: string;
};

export type TicketDto = GeneratedTicketDto & {
  // Add any UI-specific fields if needed
  categoryName?: string;
  assigneeName?: string;
  requesterName?: string;
  customFields?: CustomFieldValueDto[];
  // Wave 6 fields — added to backend TicketDto in Wave 6 PR; not yet in generated client
  // REVIEW: Remove this manual extension once the helpdesk-client package is regenerated post-merge
  isProblem?: boolean;
  isPublishedAsIdea?: boolean;
  publishedAsIdeaAt?: string | null;
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
  tagIds?: string[]; // Filter by tag IDs
  unassignedOnly?: boolean;
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
  priority?: string;
  categoryId?: string;
  assigneeId?: string;
  tags?: string[];
}
