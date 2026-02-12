// TODO: Replace with types from @brainforgeau/helpdesk-backend-client when available
// These types match the backend DTOs for Reports

import type { TicketPriority, TicketStatus } from './ticket';

export enum ReportGranularity {
  Daily = 0,
  Weekly = 1,
  Monthly = 2,
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
  dataPoints: DynamicsDataPointDto[];
}

export interface DynamicsDataPointDto {
  date: string;
  created: number;
  closed: number;
  open: number;
  averageResolutionTimeHours: number;
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

export interface TechPerformanceReportDto {
  technicians: TechPerformanceDto[];
}

export interface TechPerformanceDto {
  technicianId: string;
  technicianName: string;
  assignedCount: number;
  resolvedCount: number;
  averageResolutionTimeHours: number;
  averageFirstResponseTimeHours: number;
  p50ResolutionTimeHours: number;
  p90ResolutionTimeHours: number;
}

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  granularity?: ReportGranularity;
  categoryIds?: string[];
  technicianIds?: string[];
}
