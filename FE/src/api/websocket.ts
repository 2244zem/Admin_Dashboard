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
      return;
    }

    const url = new URL(BASE_URL);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = "/ws";
    // Backend mengharapkan token di query param (?token=). Ini adalah kontrak
    // resmi API. Risiko kebocoran (log proxy/history) dikompensasi dengan
    // token berumur pendek + WSS di production. Catatan: idealnya backend
    // juga mendukung header/SubProtocol di masa depan.
    url.searchParams.set("token", token);

    socket = new WebSocket(url.toString());

    socket.onopen = () => {
      if (import.meta.env.DEV) console.log("[ws] connected to", url.toString());
      options.onConnected?.();
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (import.meta.env.DEV) console.log("[ws] message", JSON.stringify(payload));

        if (payload?.type === "CONNECTED") {
          options.onConnected?.();
          return;
        }

        options.onNotification(payload);
      } catch {
        // Silently ignore parse errors
      }
    };

    socket.onerror = (event) => {
      options.onError?.(event);
    };

    socket.onclose = () => {
      if (closedByClient) {
        return;
      }
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
