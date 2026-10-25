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

/**
 * Coerce either wire form to the status NAME ("New", "InProgress", "Closed").
 *
 * MIND THE TWO ENUMS. The `TicketStatus` in this file is numeric (New = 1),
 * because that is what the custom-status editor binds its select keys to. The
 * `TicketStatus` in types/ticket.ts is a STRING enum whose values are those
 * names, and that is what the ticket pickers and every status patch use.
 * Same name, different type, and TypeScript will not catch the mix-up because
 * both ends are cast.
 *
 * Anything crossing from a custom status (which stores `mapsToStatus` in the
 * numeric space) to a ticket update has to come through here.
 */
export const toTicketStatusName = (
  value: TicketStatusWire,
): keyof typeof TicketStatus =>
  typeof value === 'number'
    ? (TicketStatus[value] as keyof typeof TicketStatus)
    : value;

/**
 * Marks a custom-status id inside a picker whose other options are built-in
 * `TicketStatus` values.
 *
 * One <select> has to offer both, and their key spaces would otherwise collide:
 * built-in keys are "1", "2", "3", and nothing stops a custom status from being
 * created with an id that reads like one. The prefix keeps the two apart and
 * makes the decode a startsWith rather than a guess.
 *
 * This lived inside TicketFilters as a local const. It is shared now because
 * the ticket's own Status selector needs exactly the same encoding, and two
 * copies of a wire format drift.
 */
export const CUSTOM_STATUS_PREFIX = 'custom:';

export const encodeCustomStatusKey = (id: string): string =>
  `${CUSTOM_STATUS_PREFIX}${id}`;

/** The id, or null when the key is a built-in status rather than a custom one. */
export const decodeCustomStatusKey = (key: string): string | null =>
  key.startsWith(CUSTOM_STATUS_PREFIX)
    ? key.slice(CUSTOM_STATUS_PREFIX.length)
    : null;

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

/** One entry in a status picker: a built-in status or a custom one. */
export interface StatusPickerOption {
  /** Encoded key. A built-in status NAME, or a prefixed custom-status id. */
  key: string;
  label: string;
  isCustom: boolean;
}

/**
 * Whether the viewer's custom statuses may be offered for these tickets.
 *
 * Custom statuses belong to one company, and the list the app loads is the
 * viewer's own. The backend refuses one on another company's ticket
 * (CustomStatus.OtherCompany), so a ticket, or any ticket in a selection,
 * outside the viewer's company is offered New, In Progress and Closed only.
 * The one rule for the list's row menu and bulk Change Status. (The ticket
 * page needs no rule: it runs in its ticket's company and loads that
 * company's own statuses.)
 */
export const customStatusesApply = (
  viewerTenantId: string | null | undefined,
  ticketTenantIds: ReadonlyArray<string | null | undefined>,
): boolean =>
  !!viewerTenantId && ticketTenantIds.every(id => id === viewerTenantId);

/**
 * The options every ticket status picker should offer.
 *
 * Built in three places by hand before this existed: the ticket sidebar, the
 * grid's row menu and the bulk modal. Only the sidebar ever gained custom
 * statuses, so the same status was applicable from one screen and invisible on
 * the others.
 *
 * `currentCustomStatusId` keeps a retired status selectable on the ticket
 * already using it. Deactivating a status should stop new use, not make the
 * tickets on it unreadable. Pass undefined where there is no single current
 * ticket, as in a bulk action.
 */
export const buildStatusOptions = (
  customStatuses: CustomTicketStatusDto[],
  currentCustomStatusId?: string | null,
): StatusPickerOption[] => [
  { key: 'New', label: 'New', isCustom: false },
  { key: 'InProgress', label: 'In Progress', isCustom: false },
  { key: 'Closed', label: 'Closed', isCustom: false },
  ...customStatuses
    .filter(cs => cs.isActive || cs.id === currentCustomStatusId)
    .map(cs => ({
      key: encodeCustomStatusKey(cs.id),
      label: cs.name,
      isCustom: true,
    })),
];

/** What a status patch needs: the system status, plus the custom id or null. */
export interface ResolvedStatusSelection {
  status: keyof typeof TicketStatus;
  customStatusId: string | null;
}

/**
 * Turn a picker key into the pair a status patch carries.
 *
 * A custom status refines the system status rather than replacing it, so both
 * travel together and the system half follows the custom status's declared
 * `mapsToStatus`. Every count, filter, tab and SLA rule reads the system
 * status, so letting it fall out of step would desync all of them.
 *
 * `customStatusId` is null rather than undefined for a built-in selection: the
 * command assigns the field unconditionally, so null is what detaches a custom
 * status from a ticket that had one.
 *
 * Returns null for a custom id that is not in the list, which means the status
 * was deleted between render and click. Callers should do nothing rather than
 * guess a system status.
 */
export const resolveStatusKey = (
  key: string,
  customStatuses: CustomTicketStatusDto[],
): ResolvedStatusSelection | null => {
  const customId = decodeCustomStatusKey(key);
  if (!customId) {
    return { status: key as keyof typeof TicketStatus, customStatusId: null };
  }
  const custom = customStatuses.find(cs => cs.id === customId);
  if (!custom) return null;
  return {
    status: toTicketStatusName(custom.mapsToStatus),
    customStatusId: custom.id,
  };
};
