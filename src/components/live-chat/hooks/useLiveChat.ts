import { createHelpdeskApiClient } from '@/state/helpdeskApiClient';
import type {
  LiveChatWidgetConfigDto,
  UpdateLiveChatConfigRequest,
} from '@/types/live-chat';
import { LiveChatApi } from '@brainforgeau/helpdesk-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const LIVE_CHAT_CONFIG_KEY = 'helpdesk-live-chat-config';

export const useGetLiveChatConfig = () => {
  const { data, isLoading, refetch } = useQuery<LiveChatWidgetConfigDto>({
    queryKey: [LIVE_CHAT_CONFIG_KEY],
    queryFn: async () => {
      const client = await createHelpdeskApiClient(LiveChatApi);
      const response = await client.v1LiveChatConfigGet();
      return response.data as LiveChatWidgetConfigDto;
    },
  });

  return { config: data ?? null, isLoading, refetch };
};

export const useUpdateLiveChatConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateLiveChatConfigRequest) => {
      const client = await createHelpdeskApiClient(LiveChatApi);
      await client.v1LiveChatConfigPut(payload as never);
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
      const client = await createHelpdeskApiClient(LiveChatApi);
      const response = await client.v1LiveChatEmbedScriptGet();
      return (response.data as string) ?? '';
    },
  });

  return { embedScript: data ?? '', isLoading };
};
