// TODO: Replace with types from @brainforgeau/helpdesk-backend-client when available
// These types match the backend DTOs for SLA.
//
// REVIEW: TimeEntryDto / TicketTimeTrackingDto moved to
// src/components/sla/hooks/useTimeTracking.ts, sourced directly from the
// generated HelpdeskApplicationTimeTrackingDTOsTimeEntryDto — no local
// duplicate DTO shape anymore.

export enum SlaStatus {
  OnTrack = 0,
  Warning = 1,
  Breached = 2,
}

export interface SlaIndicatorDto {
  ticketId: string;
  responseTimeDeadline?: string;
  responseTimeRemaining?: number; // minutes
  responseStatus?: SlaStatus;
  resolutionTimeDeadline?: string;
  resolutionTimeRemaining?: number; // minutes
  resolutionStatus?: SlaStatus;
}
