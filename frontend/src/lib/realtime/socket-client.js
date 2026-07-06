import useWebSocket, { ReadyState } from "react-use-websocket";

const DEFAULT_WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || "ws://localhost:8000";
const DEFAULT_HEARTBEAT_MESSAGE = import.meta.env.VITE_WS_HEARTBEAT_MESSAGE || "ping";

export const realtimeChannels = {
  notifications: "notifications",
  messages: "messages",
  swaps: "swaps",
  sessions: "sessions",
  dashboards: "dashboards",
};

export function buildWebSocketPathUrl(path, params = {}) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(normalizedPath, DEFAULT_WS_BASE_URL);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

export function buildWebSocketUrl(channel, params = {}) {
  return buildWebSocketPathUrl(`/ws/${channel}/`, params);
}

export function createRealtimeOptions(overrides = {}) {
  return {
    share: true,
    shouldReconnect: () => true,
    reconnectAttempts: 10,
    reconnectInterval: (attemptNumber) => Math.min(1000 * 2 ** attemptNumber, 10000),
    heartbeat: {
      message: DEFAULT_HEARTBEAT_MESSAGE,
      returnMessage: DEFAULT_HEARTBEAT_MESSAGE,
      interval: 30000,
      timeout: 10000,
    },
    ...overrides,
  };
}

export function mapReadyStateToConnectionState(readyState) {
  switch (readyState) {
    case ReadyState.OPEN:
      return "connected";
    case ReadyState.CONNECTING:
      return "connecting";
    case ReadyState.CLOSING:
      return "disconnecting";
    case ReadyState.CLOSED:
      return "disconnected";
    default:
      return "idle";
  }
}

export function useRealtimeChannel(channel, params = {}, overrides = {}) {
  return useRealtimePath(`/ws/${channel}/`, params, overrides, true);
}

export function useRealtimePath(path, params = {}, overrides = {}, enabled = true) {
  const socketUrl = enabled && path ? buildWebSocketPathUrl(path, params) : null;
  return useWebSocket(socketUrl, createRealtimeOptions(overrides));
}
