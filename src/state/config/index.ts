import { RuntimeConfig, defaultConfig } from '@brainforgeau/security';
import { atom } from 'jotai';

// Access global config injected by Modern.js build
declare const __HELPDESK_CONFIG__: string;

// Parse config from global variable
const buildConfigFromGlobals = (): RuntimeConfig => {
  if (typeof __HELPDESK_CONFIG__ !== 'undefined') {
    try {
      return JSON.parse(__HELPDESK_CONFIG__) as RuntimeConfig;
    } catch (error) {
      console.error('Failed to parse __HELPDESK_CONFIG__:', error);
      return defaultConfig;
    }
  }
  return defaultConfig;
};

// Atom to hold the config state - initialized from global variable
export const configAtom = atom<RuntimeConfig>(buildConfigFromGlobals());
