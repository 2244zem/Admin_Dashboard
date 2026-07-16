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
    // Backend mengharapkan token di query param (?token=). Ini adalah kontrak
    // resmi API. Risiko kebocoran (log proxy/history) dikompensasi dengan
    // token berumur pendek + WSS di production. Catatan: idealnya backend
    // juga mendukung header/SubProtocol di masa depan.
    url.searchParams.set("token", token);

    console.log("🔌 WebSocket: Connecting to", url.toString());

    socket = new WebSocket(url.toString());

    socket.onopen = () => {
      console.log("✅ WebSocket: Connected successfully");
      options.onConnected?.();
    };

    socket.onmessage = (event) => {
      console.log("📨 WebSocket: Message received:", event.data);

      try {
        const payload = JSON.parse(event.data);
        console.log("📦 WebSocket: Parsed payload:", payload);

        if (payload?.type === "CONNECTED") {
          console.log("ℹ️ WebSocket: Ignoring CONNECTED system event");
          options.onConnected?.();
          return;
        }

        console.log(" WebSocket: Calling onNotification with payload");
        options.onNotification(payload);
      } catch (err) {
        console.error(" WebSocket: Failed to parse message:", err);
      }
    };

    socket.onerror = (event) => {
      console.error("❌ WebSocket: Error occurred", event);
      options.onError?.(event);
    };

    socket.onclose = (event) => {
      console.log("🔌 WebSocket: Disconnected, code:", event.code, "reason:", event.reason);
      if (closedByClient) {
        console.log("ℹ️ WebSocket: Closed by client, not reconnecting");
        return;
      }
      console.log("🔄 WebSocket: Reconnecting in", options.reconnectDelayMs ?? 5000, "ms");
      reconnectTimer = setTimeout(connect, options.reconnectDelayMs ?? 5000);
    };
  };

  connect();

  return () => {
    console.log("🔌 WebSocket: Cleanup called");
    closedByClient = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    socket?.close();
  };
}
