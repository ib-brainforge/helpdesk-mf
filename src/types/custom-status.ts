// REVIEW: Using local type definitions until @brainforgeau/helpdesk-client is updated
// to include the /v1/custom-statuses endpoints (Wave 7.1 backend PR #59).
// Replace with generated client types once the PR is merged and client published.

export enum TicketStatus {
  New = 1,
  InProgress = 2,
  Closed = 3,
}

export interface CustomTicketStatusDto {
  id: string;
  name: string;
  color?: string;
  sortOrder: number;
  mapsToStatus: TicketStatus;
  isClosed: boolean;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  modifiedAt: string;
}

export interface CreateCustomStatusRequest {
  name: string;
  color?: string;
  sortOrder: number;
  mapsToStatus: TicketStatus;
  isClosed: boolean;
  isDefault: boolean;
}

export interface UpdateCustomStatusRequest {
  name: string;
  color?: string;
  sortOrder: number;
  mapsToStatus: TicketStatus;
  isClosed: boolean;
  isDefault: boolean;
  isActive: boolean;
}
