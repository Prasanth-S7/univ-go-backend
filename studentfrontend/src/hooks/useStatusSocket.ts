/**
 * Status Socket Hook
 * 
 * Manages WebSocket connection for real-time submission status updates.
 * Connects when a request ID is provided, accumulates status events in a timeline,
 * and auto-closes on terminal states (success/rejected).
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { createSocket } from '@/lib/wsClient';

/**
 * Status event from WebSocket
 */
export interface StatusEvent {
  event_type: 'queued' | 'processing' | 'success' | 'rejected';
  timestamp: string;
  data: any;
}

/**
 * Return type for useStatusSocket hook
 */
export interface UseStatusSocketReturn {
  isConnected: boolean;
  events: StatusEvent[];
  currentStatus: string | null;
  error: Error | null;
}

/**
 * Terminal states that should close the connection
 */
const TERMINAL_STATES = ['success', 'rejected'];

/**
 * Hook for managing status WebSocket connection
 * 
 * @param requestId - Unique request identifier from submission response
 * @param wsUrl - WebSocket URL from submission response
 * @param enabled - Whether to establish connection
 * @returns Connection state, events timeline, current status, and error
 */
export function useStatusSocket(
  requestId: string | null | undefined,
  wsUrl: string | null | undefined,
  enabled: boolean = true
): UseStatusSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState<StatusEvent[]>([]);
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  const wsClientRef = useRef<ReturnType<typeof createSocket> | null>(null);
  const isMountedRef = useRef(true);
  const hasClosedRef = useRef(false);

  /**
   * Handle incoming WebSocket messages
   */
  const handleMessage = useCallback((data: any) => {
    if (!isMountedRef.current || hasClosedRef.current) return;

    try {
      // Handle connection acknowledgment
      if (data.type === 'connected' || data.type === 'heartbeat') {
        console.log('[StatusSocket] Connection acknowledged');
        return;
      }

      // Handle status events
      if (data.event === 'status_message' && data.payload) {
        const statusEvent: StatusEvent = {
          event_type: data.payload.event_type,
          timestamp: data.payload.timestamp,
          data: data.payload.data
        };

        console.log('[StatusSocket] Status event received:', {
          event_type: statusEvent.event_type,
          timestamp: statusEvent.timestamp
        });

        // Add event to timeline
        setEvents(prevEvents => [...prevEvents, statusEvent]);

        // Update current status
        setCurrentStatus(statusEvent.event_type);

        // Auto-close on terminal states
        if (TERMINAL_STATES.includes(statusEvent.event_type)) {
          console.log(`[StatusSocket] Terminal state reached: ${statusEvent.event_type}`);
          
          // Close connection after a short delay to ensure all messages are processed
          setTimeout(() => {
            if (wsClientRef.current && !hasClosedRef.current) {
              console.log('[StatusSocket] Closing connection due to terminal state');
              hasClosedRef.current = true;
              wsClientRef.current.close();
            }
          }, 1000);
        }
      }
    } catch (err) {
      console.error('[StatusSocket] Error processing message:', err);
      setError(err instanceof Error ? err : new Error('Failed to process status message'));
    }
  }, []);

  /**
   * Handle WebSocket close event
   */
  const handleClose = useCallback((event: CloseEvent) => {
    if (!isMountedRef.current) return;

    console.log(`[StatusSocket] Connection closed (code: ${event.code})`);
    setIsConnected(false);

    // Handle authentication/authorization failures
    if (event.code === 4401 || event.code === 4403) {
      setError(new Error('Authentication or authorization failed'));
      return;
    }

    // Handle abnormal closures (not terminal state or manual close)
    if (event.code !== 1000 && !hasClosedRef.current) {
      setError(new Error(`Connection closed unexpectedly (code: ${event.code})`));
    }
  }, []);

  /**
   * Handle WebSocket error event
   */
  const handleError = useCallback((event: Event) => {
    if (!isMountedRef.current) return;

    console.error('[StatusSocket] WebSocket error:', event);
    setError(new Error('WebSocket connection error'));
    setIsConnected(false);
  }, []);

  /**
   * Handle WebSocket open event
   */
  const handleOpen = useCallback(() => {
    if (!isMountedRef.current) return;

    console.log('[StatusSocket] Connection established');
    setIsConnected(true);
    setError(null);
  }, []);

  /**
   * Connect to WebSocket
   */
  const connect = useCallback(() => {
    if (!enabled || !requestId || !wsUrl) {
      console.log('[StatusSocket] Connection disabled or missing parameters');
      return;
    }

    if (hasClosedRef.current) {
      console.log('[StatusSocket] Connection already closed due to terminal state');
      return;
    }

    // Close existing connection
    if (wsClientRef.current) {
      wsClientRef.current.close();
      wsClientRef.current = null;
    }

    try {
      console.log(`[StatusSocket] Connecting to ${wsUrl}`);

      // Create WebSocket client using the existing createSocket utility
      const socket = createSocket(wsUrl, {
        onOpen: handleOpen,
        onClose: handleClose,
        onError: handleError,
        onMessage: handleMessage
      });

      wsClientRef.current = socket;
      
      console.log('[StatusSocket] WebSocket client created and connecting');
    } catch (err) {
      console.error('[StatusSocket] Failed to create WebSocket client:', err);
      setError(err instanceof Error ? err : new Error('Failed to create WebSocket client'));
    }
  }, [enabled, requestId, wsUrl, handleMessage, handleClose, handleError, handleOpen]);

  /**
   * Initialize connection on mount or when parameters change
   */
  useEffect(() => {
    // Reset state when requestId changes
    if (requestId) {
      setEvents([]);
      setCurrentStatus(null);
      setError(null);
      hasClosedRef.current = false;
    }

    if (enabled && requestId && wsUrl) {
      connect();
    }

    return () => {
      // Cleanup on unmount
      isMountedRef.current = false;
      
      if (wsClientRef.current) {
        console.log('[StatusSocket] Cleaning up WebSocket connection');
        wsClientRef.current.close();
        wsClientRef.current = null;
      }
    };
  }, [enabled, requestId, wsUrl, connect]);

  return {
    isConnected,
    events,
    currentStatus,
    error
  };
}
