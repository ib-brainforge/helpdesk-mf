import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import { AiAssistApi } from '@brainforgeau/helpdesk-client';
import { useMutation } from '@tanstack/react-query';

export interface AiAssistResult {
  result: string;
  provider: string;
}

export const useGetTicketSummary = () => {
  return useMutation({
    mutationFn: async (ticketId: string): Promise<AiAssistResult> => {
      const client = await createHelpdeskApiClient(AiAssistApi);
      const response = await client.v1AiTicketSummaryPost({ ticketId });
      return response.data as AiAssistResult;
    },
  });
};

export const useSuggestReply = () => {
  return useMutation({
    mutationFn: async (ticketId: string): Promise<AiAssistResult> => {
      const client = await createHelpdeskApiClient(AiAssistApi);
      const response = await client.v1AiSuggestReplyPost({ ticketId });
      return response.data as AiAssistResult;
    },
  });
};
