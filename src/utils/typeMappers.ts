/**
 * Type mapping utilities for converting between local enum types and generated client types.
 *
 * The generated client uses string literal union types, while the UI uses enums for easier usage.
 * These utilities provide type-safe conversions between the two representations.
 */

import {
  HelpdeskDomainTicketsEnumsTicketStatus,
  HelpdeskDomainTicketsEnumsTicketPriority,
  HelpdeskDomainCommentsEnumsCommentType,
  HelpdeskDomainCategoriesEnumsCustomFieldUsageType,
} from '@brainforgeau/helpdesk-client';

import {
  TicketStatus,
  TicketPriority,
} from '@/types/ticket';

import {
  CommentType,
} from '@/types/comment';

import {
  CustomFieldUsageType,
} from '@/types/custom-field';

// ============================================================================
// Ticket Status Mapping
// ============================================================================

/**
 * Convert local TicketStatus enum to generated client type
 */
export function toApiTicketStatus(
  status: TicketStatus | string
): HelpdeskDomainTicketsEnumsTicketStatus {
  return status as HelpdeskDomainTicketsEnumsTicketStatus;
}

/**
 * Convert generated client TicketStatus to local enum
 */
export function fromApiTicketStatus(
  status: HelpdeskDomainTicketsEnumsTicketStatus | undefined
): TicketStatus | undefined {
  if (!status) return undefined;
  return status as unknown as TicketStatus;
}

// ============================================================================
// Ticket Priority Mapping
// ============================================================================

/**
 * Convert local TicketPriority enum to generated client type
 */
export function toApiTicketPriority(
  priority: TicketPriority | string
): HelpdeskDomainTicketsEnumsTicketPriority {
  return priority as HelpdeskDomainTicketsEnumsTicketPriority;
}

/**
 * Convert generated client TicketPriority to local enum
 */
export function fromApiTicketPriority(
  priority: HelpdeskDomainTicketsEnumsTicketPriority | undefined
): TicketPriority | undefined {
  if (!priority) return undefined;
  return priority as unknown as TicketPriority;
}

// ============================================================================
// Comment Type Mapping
// ============================================================================

/**
 * Convert local CommentType enum to generated client type
 */
export function toApiCommentType(
  type: CommentType
): HelpdeskDomainCommentsEnumsCommentType {
  return type as unknown as HelpdeskDomainCommentsEnumsCommentType;
}

/**
 * Convert generated client CommentType to local enum
 */
export function fromApiCommentType(
  type: HelpdeskDomainCommentsEnumsCommentType | undefined
): CommentType | undefined {
  if (!type) return undefined;
  return type as unknown as CommentType;
}

// ============================================================================
// Automation Mapping (No conversion needed - numeric enums match)
// ============================================================================

/**
 * Convert local AutomationTriggerType to API type.
 * Both are numeric enums with matching values, so direct cast is safe.
 */
export function toApiAutomationTriggerType(
  type: number
): any {
  return type;
}

/**
 * Convert local ConditionMatchType to API type.
 * Both are numeric enums with matching values, so direct cast is safe.
 */
export function toApiConditionMatchType(
  type: number
): any {
  return type;
}

// ============================================================================
// Custom Field Usage Type Mapping
// ============================================================================

/**
 * Convert local CustomFieldUsageType enum to generated client type.
 * Local enum uses numeric value (0), API uses string literal ('Ticket').
 */
export function toApiCustomFieldUsageType(
  usageType: CustomFieldUsageType
): HelpdeskDomainCategoriesEnumsCustomFieldUsageType {
  return HelpdeskDomainCategoriesEnumsCustomFieldUsageType.Ticket;
}

/**
 * Convert generated client CustomFieldUsageType to local enum.
 * API uses string literal ('Ticket'), local enum uses numeric value (0).
 */
export function fromApiCustomFieldUsageType(
  usageType: HelpdeskDomainCategoriesEnumsCustomFieldUsageType | undefined
): CustomFieldUsageType | undefined {
  if (!usageType) return undefined;
  return CustomFieldUsageType.Ticket;
}

// ============================================================================
// Array Mapping Utilities
// ============================================================================

/**
 * Convert array of local TicketStatus to API format (for filters)
 */
export function toApiTicketStatusArray(
  statuses: string[] | undefined
): HelpdeskDomainTicketsEnumsTicketStatus[] | undefined {
  if (!statuses || statuses.length === 0) return undefined;
  return statuses.map(s => toApiTicketStatus(s));
}

/**
 * Convert array of local TicketPriority to API format (for filters)
 */
export function toApiTicketPriorityArray(
  priorities: string[] | undefined
): HelpdeskDomainTicketsEnumsTicketPriority[] | undefined {
  if (!priorities || priorities.length === 0) return undefined;
  return priorities.map(p => toApiTicketPriority(p));
}
