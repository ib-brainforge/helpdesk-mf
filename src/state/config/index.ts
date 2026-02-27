import { RuntimeConfig, defaultConfig } from '@brainforgeau/security';
import { atom } from 'jotai';

declare const __HELPDESK_CONFIG__: string;

export interface AppConfig extends RuntimeConfig {
  signalrHubUrl?: string;
  identityBaseUrl?: string;
  hideAppSwitcher?: boolean;
  hideContextSwitcher?: boolean;
  version?: string;
  packageVersions?: Record<string, string>;
  observability?: {
    enabled: boolean;
    loki: { url: string };
    tracing: { enabled: boolean; endpoint: string; ignoreUrlsPattern?: string };
    metrics: { enabled: boolean; webVitals: boolean };
  };
  [key: string]: any;
}

let _cachedConfig: AppConfig | null = null;

export function getAppConfig(): AppConfig {
  if (_cachedConfig) return _cachedConfig;

  if (typeof window !== 'undefined' && (window as any).__RUNTIME_CONFIG__) {
    const rc = (window as any).__RUNTIME_CONFIG__;
    if (rc.oidc?.authority) {
      _cachedConfig = rc as AppConfig;
      return _cachedConfig;
    }
  }

  if (typeof __HELPDESK_CONFIG__ !== 'undefined') {
    try {
      _cachedConfig = JSON.parse(__HELPDESK_CONFIG__) as AppConfig;
      return _cachedConfig;
    } catch (error) {
      console.error('Failed to parse __HELPDESK_CONFIG__:', error);
      _cachedConfig = defaultConfig as AppConfig;
      return _cachedConfig;
    }
  }

  _cachedConfig = defaultConfig as AppConfig;
  return _cachedConfig;
}

export const configAtom = atom<AppConfig>(getAppConfig());
export const hubConnectedAtom = atom<boolean>(false);
