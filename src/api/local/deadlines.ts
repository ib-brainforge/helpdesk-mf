/*
 * Deadline types and the deadline preview calls.
 *
 * Replace with the generated client once it is regenerated: these endpoints
 * and fields are newer than the checked-in OpenAPI spec. The shapes mirror the
 * backend DTOs exactly (design-review/notes/dev/CONTRACTS.md, Cara's section,
 * which is authoritative). Every instant is an ISO UTC string, every duration
 * is in minutes.
 *
 * This is the ONE client for the preview. Team B imports it (by cherry-pick),
 * so do not add a second copy anywhere.
 */
import { authorizedAxios } from '@/state/authorizedAxios';
import { requireHelpdeskApiBaseUrl } from '@/state/config';
import { scopedRequest } from './scoped';

export type DeadlinePriority = 'Critical' | 'High' | 'Normal' | 'Low';

/**
 * Where a policy's effective values come from: the organisation's own, its
 * company's, the principal's default, or the built-in default when the
 * principal has saved nothing.
 */
export type DeadlinePolicySource =
  | 'Organisation'
  | 'Company'
  | 'Default'
  | 'Fallback';

export interface DeadlinePolicySummaryDto {
  source: DeadlinePolicySource;
  priority: DeadlinePriority;
  replyMinutes: number;
  fixMinutes: number;
  clockMode: 'BusinessHours' | 'AllHours';
  /** "Reply within 1 hour, fix within 8 business hours." */
  targetsText: string;
  /** "Mon to Fri, 8:00 am to 5:30 pm Sydney time." */
  hoursText: string;
}

/**
 * A ticket's deadlines, as the backend computed them. The UI never does
 * business-hours maths: it only compares these instants with the clock.
 * Carried on TicketListDto.deadline (policy null) and TicketDto.deadline.
 */
export interface TicketDeadlineDto {
  /** First reply due. */
  replyDueAt: string | null;
  /** First public staff reply, null until there is one. */
  repliedAt: string | null;
  /** Fix due, the ticket's DueDate. */
  fixDueAt: string | null;
  /** When the ticket was resolved, null while open. */
  fixedAt: string | null;
  /** When the reply target turns "Due soon" (80% of the budget elapsed). */
  replyWarnAt: string | null;
  fixWarnAt: string | null;
  policy: DeadlinePolicySummaryDto | null;
}

export interface DeadlineSkippedDay {
  /** YYYY-MM-DD */
  date: string;
  reason: 'Weekend' | 'Holiday';
  holidayName?: string | null;
}

export interface DeadlinePreviewDto extends TicketDeadlineDto {
  explanation: {
    text: string;
    skippedDays: DeadlineSkippedDay[];
    restartsAt: string | null;
  };
}

export interface CompanyDeadlinePolicyInput {
  clockMode: 'BusinessHours' | 'AllHours';
  /** IANA zone, e.g. "Australia/Sydney". */
  timeZoneId: string;
  /** e.g. "AU-NSW", or null for none. */
  holidayCalendar: string | null;
  /** Exactly 7, 0 = Sunday. Times are "HH:mm". */
  days: { dayOfWeek: number; isOpen: boolean; start: string; end: string }[];
  /** Exactly 4, fix >= reply > 0. */
  targets: {
    priority: DeadlinePriority;
    replyMinutes: number;
    fixMinutes: number;
  }[];
}

/**
 * Deadline a new ticket would get, for the New Request review step. The
 * company comes from the scoped token, never the body, so pass the token
 * issued for the chosen scope when it differs from the app's context.
 */
export const previewDeadline = (
  body: { priority: DeadlinePriority; startAt?: string },
  scopeToken?: string,
): Promise<DeadlinePreviewDto> =>
  scopedRequest<DeadlinePreviewDto>({
    method: 'POST',
    url: `${requireHelpdeskApiBaseUrl()}/v1/deadlines/preview`,
    token: scopeToken,
    body,
  });

/**
 * Deadline preview for the Company Deadlines worked example (principal
 * admins). A draft `policy` wins; without one, the organisation's policy, then
 * the company's, then the principal default applies.
 */
export const previewCompanyDeadline = async (
  principalId: string,
  body: {
    tenantId?: string | null;
    organisationId?: string | null;
    policy?: CompanyDeadlinePolicyInput;
    priority: DeadlinePriority;
    startAt?: string;
  },
): Promise<DeadlinePreviewDto> => {
  const { data } = await authorizedAxios.post<DeadlinePreviewDto>(
    `${requireHelpdeskApiBaseUrl()}/v1/principals/${principalId}/company-deadlines/preview`,
    body,
  );
  return data;
};
