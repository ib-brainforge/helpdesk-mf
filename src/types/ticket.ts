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
  tagIds?: string[]; // Filter by tag IDs
  unassignedOnly?: boolean;
  /** When true, only tickets past their due date are returned (backend OverdueOnly param). */
  overdueOnly?: boolean;
  /** Filter by a custom (tenant-defined) ticket status — maps to the backend CustomStatusId param. */
  customStatusId?: string;
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
