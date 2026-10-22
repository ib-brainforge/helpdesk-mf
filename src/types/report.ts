// These types match the regenerated the vendored helpdesk client report DTOs.
// The breakdown DTOs share the shape { <key>, name, count, percentage } where
// <key> is the type-specific identifier field (status / priority / category /
// technician). Kept as local aliases so the report hook layer stays decoupled
// from the long generated type names.

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
  averageResolutionTimeHours: number | null;
  avgFirstResponseMinutes?: number | null;
  avgResolutionMinutes?: number | null;
  byStatus: StatusBreakdownDto[];
  byPriority: PriorityBreakdownDto[];
  byCategory: CategoryBreakdownDto[];
  byTechnician: TechnicianBreakdownDto[];
  fromDate?: string | null;
  toDate?: string | null;
}

export interface StatusBreakdownDto {
  /** Status enum value (e.g. "New", "InProgress", "Closed"). */
  status: string;
  /** Display name for the status. */
  name: string;
  count: number;
  percentage: number;
}

export interface PriorityBreakdownDto {
  /** Priority enum value (e.g. "Low", "Normal", "High"). */
  priority: string;
  /** Display name for the priority. */
  name: string;
  count: number;
  percentage: number;
}

export interface CategoryBreakdownDto {
  /** Category identifier. */
  category: string;
  /** Display name for the category. */
  name: string;
  count: number;
  percentage: number;
}

export interface TechnicianBreakdownDto {
  /** Technician identifier. */
  technician: string;
  /** Display name for the technician. */
  name: string;
  count: number;
  percentage: number;
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
  /**
   * Resolved server-side from the tenant's helpdesk contacts. Null when the
   * technician is not a known contact, in which case the column falls back to
   * the id rather than inventing a name.
   */
  technicianName?: string | null;
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
