import { useEffect, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { getAccessToken } from '@brainforgeau/security';
import { configAtom, type HelpdeskConfig } from '@/state/config';
import { useAtomValue } from 'jotai';

export type SignalRConnectionState = 'connected' | 'disconnected' | 'reconnecting' | 'error';

export interface UseSignalROptions {
  hubPath: string;
  autoConnect?: boolean;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onReconnecting?: () => void;
  onReconnected?: () => void;
  onError?: (error: Error) => void;
}

export interface UseSignalRReturn {
  connection: signalR.HubConnection | null;
  connectionState: SignalRConnectionState;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

/**
 * Hook to manage SignalR connection to a hub.
 * Handles authentication, auto-reconnect, and lifecycle management.
 *
 * @example
 * const { connection, isConnected } = useSignalR({
 *   hubPath: '/hubs/helpdesk',
 *   autoConnect: true,
 * });
 */
export const useSignalR = (options: UseSignalROptions): UseSignalRReturn => {
  const { hubPath, autoConnect = true, onConnected, onDisconnected, onReconnecting, onReconnected, onError } = options;

  const config = useAtomValue(configAtom) as HelpdeskConfig;
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const [connectionState, setConnectionState] = useState<SignalRConnectionState>('disconnected');

  useEffect(() => {
    const hubUrl = config?.signalrHubUrl || `${config?.api?.baseUrl || ''}${hubPath}`;

    if (!hubUrl) {
      console.warn('[useSignalR] SignalR hub URL not configured, connection will not be established');
      return;
    }

    // Build SignalR connection with authentication
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: async () => {
          const token = await getAccessToken();
          return token || '';
        },
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          // REVIEW: Exponential backoff: 0s, 2s, 10s, 30s, then max 60s
          if (retryContext.previousRetryCount === 0) return 0;
          if (retryContext.previousRetryCount === 1) return 2000;
          if (retryContext.previousRetryCount === 2) return 10000;
          if (retryContext.previousRetryCount === 3) return 30000;
          return 60000;
        },
      })
      .configureLogging(signalR.LogLevel.Information)
      .build();

    connectionRef.current = connection;

    // Connection lifecycle handlers
    connection.onclose((error) => {
      setConnectionState('disconnected');
      onDisconnected?.();
      if (error) {
        console.error('[useSignalR] Connection closed with error:', error);
        onError?.(error);
      }
    });

    connection.onreconnecting((error) => {
      setConnectionState('reconnecting');
      onReconnecting?.();
      if (error) {
        console.warn('[useSignalR] Reconnecting due to error:', error);
      }
    });

    connection.onreconnected(() => {
      setConnectionState('connected');
      onReconnected?.();
      console.info('[useSignalR] Reconnected successfully');
    });

    // Auto-connect if requested
    if (autoConnect) {
      connection
        .start()
        .then(() => {
          setConnectionState('connected');
          onConnected?.();
          console.info('[useSignalR] Connected to hub:', hubPath);
        })
        .catch((err) => {
          setConnectionState('error');
          console.error('[useSignalR] Failed to connect:', err);
          onError?.(err);
        });
    }

    // Cleanup on unmount
    return () => {
      if (connection.state !== signalR.HubConnectionState.Disconnected) {
        connection.stop().catch((err) => {
          console.error('[useSignalR] Error disconnecting:', err);
        });
      }
    };
  }, [hubPath, config?.signalrHubUrl, config?.api?.baseUrl, autoConnect, onConnected, onDisconnected, onReconnecting, onReconnected, onError]);

  const connect = async () => {
    const connection = connectionRef.current;
    if (!connection) {
      throw new Error('Connection not initialized');
    }

    if (connection.state === signalR.HubConnectionState.Disconnected) {
      try {
        await connection.start();
        setConnectionState('connected');
        onConnected?.();
      } catch (err) {
        setConnectionState('error');
        onError?.(err as Error);
        throw err;
      }
    }
  };

  const disconnect = async () => {
    const connection = connectionRef.current;
    if (!connection) return;

    if (connection.state !== signalR.HubConnectionState.Disconnected) {
      try {
        await connection.stop();
        setConnectionState('disconnected');
        onDisconnected?.();
      } catch (err) {
        console.error('[useSignalR] Error disconnecting:', err);
        throw err;
      }
    }
  };

  return {
    connection: connectionRef.current,
    connectionState,
    isConnected: connectionState === 'connected',
    connect,
    disconnect,
  };
};
