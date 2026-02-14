import type { TicketListDto } from '@/types/ticket';
import type { UserInfo } from '@/hooks/useUserEnrichment';

// Row type used by TanStack Table with enriched user data
export type TicketRow = TicketListDto & {
  assigneeUserInfo?: UserInfo | null;
  requesterUserInfo?: UserInfo | null;
};
