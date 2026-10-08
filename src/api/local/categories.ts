/*
 * Category default assignee and open-ticket counts (Configuration > Ticket
 * Categories).
 *
 * Replace with the generated client once it is regenerated: these endpoints
 * and CategoryDto.defaultAssigneeId are newer than the checked-in OpenAPI
 * spec. The shapes mirror the backend exactly
 * (design-review/notes/dev/CONTRACTS.md, Cara's section).
 *
 * The default assignee is a global Netcorp routing rule, so both calls are on
 * the principal: preset categories live there.
 */
import { authorizedAxios } from '@/state/authorizedAxios';
import { requireHelpdeskApiBaseUrl } from '@/state/config';

export interface CategoryOpenCountDto {
  categoryId: string;
  openTickets: number;
}

const base = (principalId: string) =>
  `${requireHelpdeskApiBaseUrl()}/v1/principals/${principalId}/categories`;

/** Open tickets per category, in one grouped query. */
export const getCategoryOpenCounts = async (
  principalId: string,
): Promise<CategoryOpenCountDto[]> => {
  const { data } = await authorizedAxios.get<CategoryOpenCountDto[]>(
    `${base(principalId)}/open-counts`,
  );
  return data ?? [];
};

/** Sets or clears (null) the user new tickets in this category go to. */
export const setCategoryDefaultAssignee = async (
  principalId: string,
  categoryId: string,
  assigneeId: string | null,
): Promise<void> => {
  await authorizedAxios.put(
    `${base(principalId)}/${categoryId}/default-assignee`,
    { assigneeId },
  );
};
