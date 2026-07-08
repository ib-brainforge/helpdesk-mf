/**
 * Helpdesk MF Observability Provider
 *
 * Wraps the app with observability context including:
 * - Logging   (telemetry-gateway -> Loki)
 * - Tracing   (telemetry-gateway -> Tempo)
 * - Metrics   (structured logs)
 * - Security log bridging
 *
 * Tenant-switch handling (v2.1 telemetry-gateway):
 * The minted telemetry session token has the user's tenant / organization /
 * division claims baked into its HMAC signature. When the user switches
 * context without a full reload, the cached token must be invalidated or
 * telemetry is mis-attributed to the previous tenant.
 *
 * The base `ObservabilityProvider` re-mints automatically when the
 * `tenantId` / `organizationId` / `divisionId` *values* in its config change.
 * This wrapper subscribes to the security context atom and rebuilds the config
 * with the current resolved string values on every context change — so a
 * tenant switch flows through as a config change and triggers the re-mint.
 *
 * (Passing getter functions would defeat this: a function identity never
 * changes, so the provider could not detect the switch.)
 *
 * Helpdesk platform-support agents move across tenants frequently, so this
 * re-mint-on-switch behaviour is what keeps each tenant's telemetry attributed
 * to the correct tenant rather than the one the agent started in.
 */

import { authUserAtom, selectedContextAtom } from '@/state/auth-atoms';
import {
  ObservabilityProvider as BaseObservabilityProvider,
  useLogger,
} from '@brainforgeau/observability';
import { useAtomValue } from 'jotai';
import type React from 'react';
import { useEffect, useMemo } from 'react';
import { buildObservabilityConfig } from './config';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface SecurityLogSink {
  log: (
    level: LogLevel,
    scope: string,
    message: string,
    context?: Record<string, unknown>,
  ) => void;
}

// Global key used by security package for log sink
const LOG_SINK_GLOBAL_KEY = '__BF_SECURITY_LOG_SINK__';

const setSecurityLogSink = (sink: SecurityLogSink | null): void => {
  if (typeof globalThis !== 'undefined') {
    if (sink) {
      (globalThis as Record<string, unknown>)[LOG_SINK_GLOBAL_KEY] = sink;
    } else {
      delete (globalThis as Record<string, unknown>)[LOG_SINK_GLOBAL_KEY];
    }
  }
};

const clearSecurityLogSink = (): void => {
  setSecurityLogSink(null);
};

/**
 * Bridges security package logs to the observability logger.
 * This component must be rendered inside ObservabilityProvider.
 */
function SecurityLogBridge({ children }: { children: React.ReactNode }) {
  const logger = useLogger();

  useEffect(() => {
    // Register the security log sink to forward logs to observability
    setSecurityLogSink({
      log: (
        level: LogLevel,
        scope: string,
        message: string,
        context?: Record<string, unknown>,
      ) => {
        const logFn = logger[level];
        if (logFn) {
          logFn(message, { scope, ...context });
        }
      },
    });

    // Cleanup on unmount
    return () => {
      clearSecurityLogSink();
    };
  }, [logger]);

  return <>{children}</>;
}

interface Props {
  children: React.ReactNode;
}

export function ObservabilityProvider({ children }: Props) {
  // Subscribe to the security context atoms. `authStateAtom` (the source of
  // these derived atoms) wires `subscribeToAuthState` in its `onMount`, so a
  // tenant switch in any microfrontend re-renders this provider even though it
  // sits above the AuthProvider in the tree.
  const selectedContext = useAtomValue(selectedContextAtom);
  const authUser = useAtomValue(authUserAtom);

  // Rebuild the config with the current resolved context values. When the user
  // switches tenant, these strings change, the `config` object identity
  // changes, and the base provider re-mints the telemetry session token with
  // the new tenant's context token.
  const config = useMemo(
    () =>
      buildObservabilityConfig({
        userId: authUser?.profile?.sub,
        userFullName: authUser?.profile?.name,
        tenantId: selectedContext?.tenantId ?? undefined,
        tenantName: selectedContext?.tenantName ?? undefined,
        // identity-management DTO uses British "organisationId"; the
        // observability config field is American "organizationId".
        organizationId: selectedContext?.organisationId ?? undefined,
        divisionId: selectedContext?.divisionId ?? undefined,
      }),
    [
      authUser?.profile?.sub,
      authUser?.profile?.name,
      selectedContext?.tenantId,
      selectedContext?.tenantName,
      selectedContext?.organisationId,
      selectedContext?.divisionId,
    ],
  );

  return (
    <BaseObservabilityProvider
      config={config}
      onError={(error, context) => {
        console.error('[helpdesk-mf] Error captured:', error, context);
      }}
    >
      <SecurityLogBridge>{children}</SecurityLogBridge>
    </BaseObservabilityProvider>
  );
}
