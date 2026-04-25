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

// Wave 4 report DTOs — mirror the backend DTOs in Helpdesk.Application.Reporting.DTOs

export interface OverdueTicketDto {
  id: string;
  subject: string;
  assigneeId: string | null;
  priority: string;
  daysOverdue: number;
  createdAt: string;
  dueDate: string;
  status: string;
}

export interface TicketByCategoryDto {
  categoryId: string | null;
  categoryName: string;
  total: number;
  byStatus: Record<string, number>;
}

export interface TicketByPriorityDto {
  priority: string;
  total: number;
  byStatus: Record<string, number>;
}

export interface TicketByStatusDto {
  status: string;
  total: number;
  byPriority: Record<string, number>;
}

export interface SlaPolicyComplianceDto {
  policyId: string;
  policyName: string;
  totalBreaches: number;
  responseBreaches: number;
  resolutionBreaches: number;
}

export interface SlaComplianceDto {
  fromDate: string;
  toDate: string;
  totalTickets: number;
  withinSla: number;
  breachedSla: number;
  compliancePercentage: number;
  byPolicy: SlaPolicyComplianceDto[];
}

export interface CategoryStatDto {
  categoryId: string;
  categoryName: string;
  ticketCount: number;
}

export interface AssigneeStatDto {
  assigneeId: string;
  ticketCount: number;
  resolvedCount: number;
}

export interface CompanyStatisticsDto {
  fromDate: string;
  toDate: string;
  totalTickets: number;
  openTickets: number;
  closedTickets: number;
  avgResolutionMinutes: number | null;
  avgFirstResponseMinutes: number | null;
  topCategories: CategoryStatDto[];
  topAssignees: AssigneeStatDto[];
}

export interface AgentUtilizationDto {
  agentId: string;
  ticketsAssigned: number;
  ticketsResolved: number;
  currentOpen: number;
  avgResolutionMinutes: number | null;
  fromDate: string;
  toDate: string;
}

export interface DeletedTicketDto {
  id: string;
  subject: string;
  entityType: string;
  deletedByUserId: string;
  deletedAt: string;
  reason: string | null;
  entityDescription: string | null;
}

export interface AuditLogEntryDto {
  id: string;
  entityType: string;
  entityId: string;
  entityDescription: string | null;
  actorUserId: string;
  occurredAt: string;
  reason: string | null;
}

export interface AuditLogReportDto {
  /** Paginated audit entries */
  items: AuditLogEntryDto[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AssetTicketDto {
  ticketId: string;
  subject: string;
  status: string;
  priority: string;
  assigneeId: string | null;
  createdAt: string;
}

export interface AssetsReportDto {
  assetId: string;
  tickets: AssetTicketDto[];
  ticketCount: number;
}
