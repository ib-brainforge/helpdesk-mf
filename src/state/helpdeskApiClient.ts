import { configAtom } from '@/state/config';
import { authorizedAxios, getAccessToken } from '@/state/authorizedAxios';
import { Configuration } from '@brainforgeau/helpdesk-client';
import type { RuntimeConfig } from '@brainforgeau/security';
import { getDefaultStore } from 'jotai';

const store = getDefaultStore();

export const createHelpdeskApiConfiguration = (config: RuntimeConfig) =>
  new Configuration({
    basePath: config?.api?.baseUrl ?? '',
    apiKey: async () => {
      const latestToken = await getAccessToken();
      return latestToken ? `Bearer ${latestToken}` : '';
    },
  });

type HelpdeskApiConstructor<TClient> = new (...args: any[]) => TClient;

export const createHelpdeskApiClient = async <TClient>(
  ClientCtor: HelpdeskApiConstructor<TClient>,
): Promise<TClient> => {
  const config = store.get(configAtom) as RuntimeConfig;

  if (!config?.api?.baseUrl) {
    throw new Error('API base URL is not configured');
  }

  const configuration = createHelpdeskApiConfiguration(config);
  return new ClientCtor(configuration, undefined, authorizedAxios);
};
