import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authorizedAxios } from '@/state/authorizedAxios';
import { configAtom } from '@/state/config';
import { getDefaultStore } from 'jotai';
import type { LiveChatWidgetConfigDto, UpdateLiveChatConfigRequest } from '@/types/live-chat';
import type { RuntimeConfig } from '@brainforgeau/security';

// REVIEW: Using authorizedAxios directly until helpdesk-client is updated with Wave 7.3 endpoints (backend PR #61).
// Replace with LiveChatApi from @brainforgeau/helpdesk-client once available.

const store = getDefaultStore();

function getBaseUrl(): string {
  const config = store.get(configAtom) as RuntimeConfig;
  return config?.api?.baseUrl ?? '';
}

const LIVE_CHAT_CONFIG_KEY = 'helpdesk-live-chat-config';

export const useGetLiveChatConfig = () => {
  const { data, isLoading, refetch } = useQuery<LiveChatWidgetConfigDto>({
    queryKey: [LIVE_CHAT_CONFIG_KEY],
    queryFn: async () => {
      const baseUrl = getBaseUrl();
      const response = await authorizedAxios.get<LiveChatWidgetConfigDto>(
        `${baseUrl}/v1/live-chat/config`,
      );
      return response.data;
    },
  });

  return { config: data ?? null, isLoading, refetch };
};

export const useUpdateLiveChatConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateLiveChatConfigRequest) => {
      const baseUrl = getBaseUrl();
      await authorizedAxios.put(`${baseUrl}/v1/live-chat/config`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LIVE_CHAT_CONFIG_KEY] });
    },
  });
};

export const useGetLiveChatEmbedScript = () => {
  const { data, isLoading } = useQuery<string>({
    queryKey: ['helpdesk-live-chat-embed-script'],
    queryFn: async () => {
      const baseUrl = getBaseUrl();
      const response = await authorizedAxios.get<string>(
        `${baseUrl}/v1/live-chat/embed-script`,
      );
      return response.data ?? '';
    },
  });

  return { embedScript: data ?? '', isLoading };
};
