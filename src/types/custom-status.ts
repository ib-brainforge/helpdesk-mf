// Local DTO projections used by hooks; the CustomStatusesApi is now published in helpdesk-client.
// Keeping local copies to keep the hook layer decoupled from the generated long type names.

import type { ServicesCoreAbstractionsRecordMeta } from '@brainforgeau/helpdesk-client';

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
  /** Record placement/audit metadata (DTO tenancy/scope metadata initiative). */
  meta?: ServicesCoreAbstractionsRecordMeta;
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
