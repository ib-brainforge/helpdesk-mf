// Local DTO projections used by hooks; the CustomStatusesApi is now published in helpdesk-client.
// Keeping local copies to keep the hook layer decoupled from the generated long type names.

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
