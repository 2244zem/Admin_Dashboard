import { API_BASE_URL, TOKEN_KEY } from "./client";
import type { ApiNotification } from "./notifikasi";

interface NotificationSocketOptions {
  onNotification: (payload: ApiNotification) => void;
  onConnected?: () => void;
  onError?: (event: Event) => void;
  reconnectDelayMs?: number;
}

export function connectNotificationSocket(options: NotificationSocketOptions) {
  const token = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  let socket: WebSocket | null = null;
  let reconnectTimer: number | undefined;
  let closedByClient = false;

  const connect = () => {
    if (!token) return;

    const baseUrl = API_BASE_URL || window.location.origin;
    const url = new URL(baseUrl);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = "/ws";
    url.search = "";
    url.searchParams.set("token", token);

    socket = new WebSocket(url.toString());

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

    socket.onerror = (event) => options.onError?.(event);

    socket.onclose = () => {
      if (closedByClient) return;
      reconnectTimer = window.setTimeout(connect, options.reconnectDelayMs ?? 5000);
    };
  };

  connect();

  return () => {
    closedByClient = true;
    if (reconnectTimer) window.clearTimeout(reconnectTimer);
    socket?.close();
  };
}
