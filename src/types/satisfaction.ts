// CSAT (Customer Satisfaction) types
// REVIEW: Following existing type pattern with DTOs from generated client

export interface SatisfactionRatingDto {
  id: string;
  ticketId: string;
  rating: number;
  comment?: string;
  ratedByUserId?: string;
  ratedByUserName?: string;
  ratedAt: string;
}

export interface SubmitSatisfactionRatingRequest {
  token: string;
  rating: number;
  comment?: string;
}

export interface UpdateSatisfactionRatingRequest {
  ratingId: string;
  rating: number;
  comment?: string;
}

export interface CSATReportDto {
  averageRating: number;
  totalRatings: number;
  satisfactionPercentage: number;
  ratingDistribution: {
    rating1Count: number;
    rating2Count: number;
    rating3Count: number;
    rating4Count: number;
    rating5Count: number;
  };
  groupedData?: CSATGroupedDataDto[];
}

export interface CSATGroupedDataDto {
  groupKey: string;
  groupName: string;
  averageRating: number;
  count: number;
}

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
