import { tokenStorage } from "../lib/tokenStorage";

// Base URL from environment
const BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;

interface NotificationSocketOptions {
  onNotification: (payload: unknown) => void;
  onConnected?: () => void;
  onError?: (event: Event) => void;
  reconnectDelayMs?: number;
}

/**
 * Connect to WebSocket for real-time notifications
 * Uses tokenStorage for consistent token retrieval
 */
export function connectNotificationSocket(options: NotificationSocketOptions) {
  const token = tokenStorage.getToken();
  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let closedByClient = false;

  const connect = () => {
    if (!token) {
      console.warn("WebSocket: No token available, skipping connection");
      return;
    }

    const url = new URL(BASE_URL);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = "/ws";
    url.searchParams.set("token", token);

    socket = new WebSocket(url.toString());

    socket.onopen = () => {
      console.log("WebSocket: Connected");
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload?.type === "CONNECTED") {
          options.onConnected?.();
          return;
        }
        options.onNotification(payload);
      } catch {
        // Ignore malformed realtime messages.
      }
    };

    socket.onerror = (event) => {
      console.error("WebSocket: Error", event);
      options.onError?.(event);
    };

    socket.onclose = () => {
      console.log("WebSocket: Disconnected");
      if (closedByClient) return;
      reconnectTimer = setTimeout(connect, options.reconnectDelayMs ?? 5000);
    };
  };

  connect();

  return () => {
    closedByClient = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    socket?.close();
  };
}
