import { authorizedAxios } from '@/state/authorizedAxios';
import { configAtom } from '@/state/config';
import type { RuntimeConfig } from '@brainforgeau/security';
import { useMutation } from '@tanstack/react-query';
import { getDefaultStore } from 'jotai';

// REVIEW: Uses authorizedAxios directly because POST /v1/ai/ticket-summary and
// POST /v1/ai/suggest-reply are not yet in the published @brainforgeau/helpdesk-client.
// Switch to the generated client once the backend PR is merged and the package is republished.
const getApiBaseUrl = (): string => {
  const store = getDefaultStore();
  const config = store.get(configAtom) as RuntimeConfig;
  return config?.api?.baseUrl ?? '';
};

export interface AiAssistResult {
  result: string;
  provider: string;
}

export const useGetTicketSummary = () => {
  return useMutation({
    mutationFn: async (ticketId: string): Promise<AiAssistResult> => {
      const baseUrl = getApiBaseUrl();
      const response = await authorizedAxios.post<AiAssistResult>(
        `${baseUrl}/v1/ai/ticket-summary`,
        { ticketId },
      );
      return response.data;
    },
  });
};

export const useSuggestReply = () => {
  return useMutation({
    mutationFn: async (ticketId: string): Promise<AiAssistResult> => {
      const baseUrl = getApiBaseUrl();
      const response = await authorizedAxios.post<AiAssistResult>(
        `${baseUrl}/v1/ai/suggest-reply`,
        { ticketId },
      );
      return response.data;
    },
  });
};
