// TODO: Replace with types from @brainforgeau/helpdesk-backend-client when available
// These types match the backend DTOs for SLA and Time Tracking

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

export interface TimeEntryDto {
  id: string;
  ticketId: string;
  userId: string;
  userName?: string;
  startTime: string;
  endTime?: string;
  durationMinutes?: number;
  notes?: string;
  isBillable: boolean;
  createdAt: string;
}

export interface CreateTimeEntryDto {
  ticketId: string;
  startTime: string;
  endTime?: string;
  durationMinutes?: number;
  notes?: string;
  isBillable?: boolean;
}

export interface UpdateTimeEntryDto {
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  notes?: string;
  isBillable?: boolean;
}

export interface TicketTimeTrackingDto {
  ticketId: string;
  totalMinutes: number;
  billableMinutes: number;
  entries: TimeEntryDto[];
  activeEntry?: TimeEntryDto;
}
