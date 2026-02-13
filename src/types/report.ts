// TODO: Replace with types from @brainforgeau/helpdesk-backend-client when available
// These types match the backend DTOs for Reports

import type { TicketPriority, TicketStatus } from './ticket';

export enum ReportGranularity {
  Daily = 'Daily',
  Weekly = 'Weekly',
  Monthly = 'Monthly',
}

export interface TicketSummaryReportDto {
  totalCreated: number;
  totalClosed: number;
  totalOpen: number;
  averageResolutionTimeHours: number;
  byStatus: StatusBreakdownDto[];
  byPriority: PriorityBreakdownDto[];
  byCategory: CategoryBreakdownDto[];
  byTechnician: TechnicianBreakdownDto[];
}

export interface StatusBreakdownDto {
  status: TicketStatus;
  statusName: string;
  count: number;
  percentage: number;
}

export interface PriorityBreakdownDto {
  priority: TicketPriority;
  priorityName: string;
  count: number;
  percentage: number;
}

export interface CategoryBreakdownDto {
  categoryId: string;
  categoryName: string;
  count: number;
  percentage: number;
}

export interface TechnicianBreakdownDto {
  technicianId: string;
  technicianName: string;
  assignedCount: number;
  resolvedCount: number;
  averageResolutionTimeHours: number;
}

export interface DynamicsReportDto {
  granularity: ReportGranularity;
  fromDate?: string;
  toDate?: string;
  dataPoints: DynamicsDataPointDto[];
}

export interface DynamicsDataPointDto {
  periodStart: string;
  periodEnd: string;
  createdCount: number;
  closedCount: number;
  reopenedCount: number;
  netOpen: number;
  avgResolutionMinutes: number | null;
}

export interface CustomReportRequestDto {
  startDate?: string;
  endDate?: string;
  status?: TicketStatus[];
  priority?: TicketPriority[];
  categoryIds?: string[];
  technicianIds?: string[];
  columns: string[]; // e.g., ["subject", "status", "priority", "createdAt", "assignee"]
}

export interface CustomReportResultDto {
  columns: string[];
  rows: Record<string, unknown>[];
  totalCount: number;
}

export interface TechPerformanceDto {
  technicianId: string;
  ticketsAssigned: number;
  ticketsResolved: number;
  avgResolutionMinutes: number | null;
  avgFirstResponseMinutes: number | null;
  p50ResolutionMinutes: number | null;
  p90ResolutionMinutes: number | null;
  p95ResolutionMinutes: number | null;
  fromDate: string;
  toDate: string;
}

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  granularity?: ReportGranularity;
  categoryIds?: string[];
  technicianIds?: string[];
}
