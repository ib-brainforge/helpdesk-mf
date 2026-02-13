import { atom } from 'jotai';
import {
  getAuthState,
  subscribeToAuthState,
  type AuthState,
} from '@brainforgeau/security';

/**
 * Local reactive auth state atom that syncs with the security package's window state.
 * This provides reactive updates when auth state changes across microfrontends.
 */
export const authStateAtom = atom<AuthState>(getAuthState());

authStateAtom.onMount = (set) => {
  // Initialize with current state
  set(getAuthState());
  // Subscribe to state changes and return the unsubscribe function
  return subscribeToAuthState(set);
};

/**
 * Derived atom for the selected context
 */
export const selectedContextAtom = atom((get) => get(authStateAtom).selectedContext);

/**
 * Derived atom for the authenticated user
 */
export const authUserAtom = atom((get) => get(authStateAtom).user);

/**
 * Derived atom for the context token
 */
export const contextTokenAtom = atom((get) => get(authStateAtom).contextToken);
