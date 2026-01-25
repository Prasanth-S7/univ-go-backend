import ReconnectingWebSocket, { Options as ReconnectOptions } from "reconnecting-websocket";

type MessageHandler<T> = (data: T) => void;

export interface SocketHandlers<T> {
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  onMessage?: MessageHandler<T>;
  onReconnect?: () => void;
}

const DEFAULT_OPTIONS: ReconnectOptions = {
  maxRetries: Infinity,
  reconnectInterval: 2000,
};

const getBaseWsUrl = () => {
  if (import.meta.env.VITE_WS_BASE_URL) {
    return import.meta.env.VITE_WS_BASE_URL;
  }

  if (typeof window !== "undefined") {
    return window.location.origin.replace(/^http/i, "ws");
  }

  return "ws://localhost:8000";
};

export const buildWsUrl = (path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getBaseWsUrl()}${normalizedPath}`;
};

export const createSocket = <T = unknown>(
  path: string,
  handlers: SocketHandlers<T> = {},
  options: Partial<ReconnectOptions> = {}
) => {
  const socket = new ReconnectingWebSocket(buildWsUrl(path), [], {
    ...DEFAULT_OPTIONS,
    ...options,
  });

  // Track if this is the first connection or a reconnection
  let hasConnectedBefore = false;

  socket.addEventListener("open", () => {
    // If we've connected before, this is a reconnection
    if (hasConnectedBefore && handlers.onReconnect) {
      handlers.onReconnect();
    }
    hasConnectedBefore = true;
    handlers.onOpen?.();
  });
  
  socket.addEventListener("close", (event) => handlers.onClose?.(event));
  socket.addEventListener("error", (event) => handlers.onError?.(event));
  socket.addEventListener("message", (event) => {
    if (!handlers.onMessage) return;
    try {
      const parsed = JSON.parse(event.data);
      handlers.onMessage(parsed);
    } catch (error) {
      console.error("Failed to parse websocket payload", error);
    }
  });

  return socket;
};

