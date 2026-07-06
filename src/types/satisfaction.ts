// CSAT (Customer Satisfaction) types
//
// REVIEW: SatisfactionRatingDto / CSATReportDto / CSATGroupedDataDto now come
// directly from the generated client (HelpdeskApplicationSatisfactionDTOs*),
// see src/hooks/useSatisfaction.ts. Only the request-filter shapes and the
// purely-frontend CSATGroupBy grouping concept remain local here.

export enum CSATGroupBy {
  Technician = 'technician',
  Category = 'category',
  Priority = 'priority',
  Month = 'month',
}

export interface CSATReportFilters {
  dateFrom?: string;
  dateTo?: string;
  groupBy?: CSATGroupBy;
}

export interface SatisfactionRatingsListFilters {
  dateFrom?: string;
  dateTo?: string;
  rating?: number;
  assignedTechnicianId?: string;
  categoryId?: string;
  page?: number;
  pageSize?: number;
}
