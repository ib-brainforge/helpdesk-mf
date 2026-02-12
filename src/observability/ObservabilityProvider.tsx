/**
 * Helpdesk MF Observability Provider
 *
 * Wraps the app with observability context including:
 * - Logging (with Loki integration)
 * - Tracing (with Tempo integration)
 * - Metrics (with Prometheus integration)
 * - Security log bridging
 */

import React, { useEffect } from 'react';
import {
  ObservabilityProvider as BaseObservabilityProvider,
  useLogger,
} from '@brainforgeau/observability';
import { observabilityConfig } from './config';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface SecurityLogSink {
  log: (level: LogLevel, scope: string, message: string, context?: Record<string, unknown>) => void;
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
      log: (level: LogLevel, scope: string, message: string, context?: Record<string, unknown>) => {
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
  return (
    <BaseObservabilityProvider
      config={observabilityConfig}
      onError={(error, context) => {
        console.error('[helpdesk-mf] Error captured:', error, context);
      }}
    >
      <SecurityLogBridge>{children}</SecurityLogBridge>
    </BaseObservabilityProvider>
  );
}
