// Local DTO projections used by hooks; the CustomStatusesApi is now published in helpdesk-client.
// Keeping local copies to keep the hook layer decoupled from the generated long type names.

import type { ServicesCoreAbstractionsRecordMeta } from '@brainforgeau/helpdesk-client';

export enum TicketStatus {
  New = 1,
  InProgress = 2,
  Closed = 3,
}

/**
 * What the API actually sends for a status enum.
 *
 * The backend serialises enums as NAMES, so `mapsToStatus` arrives as
 * "Closed", not 3, even though the numeric enum above is what the UI binds
 * its <select> keys to. Typing these fields as bare `TicketStatus` said they
 * were numbers and let a string through unchecked.
 */
export type TicketStatusWire = TicketStatus | keyof typeof TicketStatus;

/**
 * Coerce either wire form to the numeric enum.
 *
 * Needed because the editor's select keys are the numeric values ("1", "2",
 * "3"). Handed the string "Closed" it matched no option, so the field
 * rendered its fallback and every saved mapping looked like it had been
 * discarded. The value was in the database the whole time.
 */
export const toTicketStatus = (value: TicketStatusWire): TicketStatus =>
  typeof value === 'number' ? value : TicketStatus[value];

export interface CustomTicketStatusDto {
  id: string;
  name: string;
  color?: string;
  sortOrder: number;
  mapsToStatus: TicketStatusWire;
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
  mapsToStatus: TicketStatusWire;
  isClosed: boolean;
  isDefault: boolean;
}

export interface UpdateCustomStatusRequest {
  name: string;
  color?: string;
  sortOrder: number;
  mapsToStatus: TicketStatusWire;
  isClosed: boolean;
  isDefault: boolean;
  isActive: boolean;
}
