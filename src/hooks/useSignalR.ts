import { useEffect, useRef, useState } from 'react';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';
import { getAccessToken, getContextToken } from '@brainforgeau/security';
import { configAtom, hubConnectedAtom, type AppConfig } from '@/state/config';
import { useAtomValue, useSetAtom } from 'jotai';

export type SignalRConnectionState = 'connected' | 'disconnected' | 'reconnecting' | 'error';

// Auto-reconnect delays (milliseconds)
const RECONNECT_DELAYS = [0, 2000, 5000, 10000, 30000];

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
  connection: HubConnection | null;
  connectionState: SignalRConnectionState;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

/**
 * Hook to manage SignalR connection to a hub.
 * Passes JWT tokens via query string (same pattern as tracking-mf)
 * because WebSocket connections cannot use Authorization headers
 * after the initial handshake.
 */
export const useSignalR = (options: UseSignalROptions): UseSignalRReturn => {
  const { hubPath, autoConnect = true, onConnected, onDisconnected, onReconnecting, onReconnected, onError } = options;

  const config = useAtomValue(configAtom) as AppConfig;
  const setHubConnected = useSetAtom(hubConnectedAtom);
  const connectionRef = useRef<HubConnection | null>(null);
  const [connectionState, setConnectionState] = useState<SignalRConnectionState>('disconnected');

  useEffect(() => {
    let cancelled = false;
    const hubBaseUrl = config?.signalrHubUrl || `${config?.api?.baseUrl || ''}${hubPath}`;

    if (!hubBaseUrl) {
      console.warn('[useSignalR] SignalR hub URL not configured, connection will not be established');
      return;
    }

    // Build hub URL with tokens in query string and start connection
    // WebSocket connections cannot use Authorization headers after the initial handshake,
    // so we must pass tokens via query string for the backend to extract them
    const startConnection = async () => {
      const accessToken = await getAccessToken();
      const contextToken = getContextToken();

      const params = new URLSearchParams();
      if (accessToken) {
        params.set('access_token', accessToken);
      }
      if (contextToken) {
        params.set('context_token', contextToken);
      }

      const hubUrl = params.toString() ? `${hubBaseUrl}?${params.toString()}` : hubBaseUrl;

      if (cancelled) return;

      const connection = new HubConnectionBuilder()
        .withUrl(hubUrl)
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (retryContext) => {
            if (retryContext.previousRetryCount >= RECONNECT_DELAYS.length) {
              return null;
            }
            return RECONNECT_DELAYS[retryContext.previousRetryCount] ?? null;
          },
        })
        .configureLogging(LogLevel.Information)
        .build();

      connectionRef.current = connection;

      // Connection lifecycle handlers
      connection.onclose((error) => {
        setConnectionState('disconnected');
        setHubConnected(false);
        onDisconnected?.();
        if (error) {
          console.error('[useSignalR] Connection closed with error:', error);
          onError?.(error);
        }
      });

      connection.onreconnecting((error) => {
        setConnectionState('reconnecting');
        setHubConnected(false);
        onReconnecting?.();
        if (error) {
          console.warn('[useSignalR] Reconnecting due to error:', error);
        }
      });

      connection.onreconnected(() => {
        setConnectionState('connected');
        setHubConnected(true);
        onReconnected?.();
        console.info('[useSignalR] Reconnected successfully');
      });

      try {
        await connection.start();
        if (!cancelled) {
          setConnectionState('connected');
          setHubConnected(true);
          onConnected?.();
          console.info('[useSignalR] Connected to hub:', hubPath);
        }
      } catch (err: any) {
        if (!cancelled) {
          setConnectionState('error');
          console.error('[useSignalR] Failed to connect:', err);
          onError?.(err);
        }
      }
    };

    if (autoConnect) {
      startConnection();
    }

    // Cleanup on unmount
    return () => {
      cancelled = true;
      setHubConnected(false);
      const connection = connectionRef.current;
      if (connection && connection.state !== HubConnectionState.Disconnected) {
        connection.stop().catch((err) => {
          console.error('[useSignalR] Error disconnecting:', err);
        });
      }
    };
  }, [hubPath, config?.signalrHubUrl, config?.api?.baseUrl, autoConnect]);

  const connect = async () => {
    const connection = connectionRef.current;
    if (!connection) {
      throw new Error('Connection not initialized');
    }

    if (connection.state === HubConnectionState.Disconnected) {
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

    if (connection.state !== HubConnectionState.Disconnected) {
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
