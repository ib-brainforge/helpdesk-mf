import type { UserInfo } from '@/hooks/useUserEnrichment';
import type { TicketListDto } from '@/types/ticket';

// Row type used by TanStack Table with enriched user data
export type TicketRow = TicketListDto & {
  assigneeUserInfo?: UserInfo | null;
  requesterUserInfo?: UserInfo | null;
};
