/*
 * Ticket fields newer than the generated client (contacts and the
 * confirmation email on create), and the contact list read under a chosen
 * company's token, which the generated client cannot send.
 *
 * Replace with the generated client once it is regenerated. Shapes mirror the
 * backend exactly (design-review/notes/dev/CONTRACTS.md, Ben's section).
 */
import { requireHelpdeskApiBaseUrl } from '@/state/config';
import { scopedRequest } from './scoped';

/** Added to POST /v1/tickets. The response is still the new ticket's id. */
export interface CreateTicketContactFields {
  /** An existing contact; the one replies are emailed to. Never the requester. */
  contactId?: string;
  /** Or a new one, found or created by email within the tenant. */
  newContact?: { displayName: string; email: string; phone?: string };
  /** Staff only: email the contact a confirmation from the creator's mailbox. */
  notifyContact?: boolean;
}

/** HelpdeskContactListDto, the rows of GET /v1/contacts. */
export interface HelpdeskContactListDto {
  id: string;
  email: string;
  displayName: string;
  phone?: string | null;
  isEmailOnly: boolean;
}

interface PagedContacts {
  items?: HelpdeskContactListDto[];
  totalCount?: number;
}

/**
 * Contacts matching `searchTerm` in the scope the token was issued for (the
 * company chosen on New Request), or in the app's own context without one.
 */
export const searchContacts = async (
  searchTerm: string,
  scopeToken?: string,
): Promise<HelpdeskContactListDto[]> => {
  const data = await scopedRequest<PagedContacts>({
    url: `${requireHelpdeskApiBaseUrl()}/v1/contacts`,
    token: scopeToken,
    params: { searchTerm: searchTerm || undefined, page: 1, pageSize: 20 },
  });
  return data?.items ?? [];
};
