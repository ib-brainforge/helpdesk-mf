import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import { AiAssistApi } from '@brainforgeau/helpdesk-client';
import { useMutation } from '@tanstack/react-query';

export interface AiAssistResult {
  result: string;
  provider: string;
}

export const useGetTicketSummary = () => {
  return useMutation({
    mutationFn: async ({
      ticketId,
      signal,
    }: { ticketId: string; signal?: AbortSignal }): Promise<AiAssistResult> => {
      const client = await createHelpdeskApiClient(AiAssistApi);
      const response = await client.v1AiTicketSummaryPost(
        { ticketId },
        { signal },
      );
      return response.data as AiAssistResult;
    },
  });
};

export const useSuggestReply = () => {
  return useMutation({
    mutationFn: async ({
      ticketId,
      signal,
    }: { ticketId: string; signal?: AbortSignal }): Promise<AiAssistResult> => {
      const client = await createHelpdeskApiClient(AiAssistApi);
      const response = await client.v1AiSuggestReplyPost(
        { ticketId },
        { signal },
      );
      return response.data as AiAssistResult;
    },
  });
};
