import { RuntimeConfig, defaultConfig } from '@brainforgeau/security';
import { atom } from 'jotai';

export interface HelpdeskConfig extends RuntimeConfig {
  signalrHubUrl?: string;
}

declare const __HELPDESK_CONFIG__: string;

const getConfig = (): HelpdeskConfig => {
  if (typeof window !== 'undefined' && (window as any).__RUNTIME_CONFIG__) {
    const rc = (window as any).__RUNTIME_CONFIG__;
    if (rc.oidc?.authority) {
      return rc as HelpdeskConfig;
    }
  }

  if (typeof __HELPDESK_CONFIG__ !== 'undefined') {
    try {
      return JSON.parse(__HELPDESK_CONFIG__) as HelpdeskConfig;
    } catch (error) {
      console.error('Failed to parse __HELPDESK_CONFIG__:', error);
      return defaultConfig;
    }
  }

  return defaultConfig;
};

export const configAtom = atom<HelpdeskConfig>(getConfig());
export const hubConnectedAtom = atom<boolean>(false);
