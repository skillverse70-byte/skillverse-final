import useWebSocket from "react-use-websocket";

const DEFAULT_WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || "ws://localhost:8000";
const DEFAULT_HEARTBEAT_MESSAGE = import.meta.env.VITE_WS_HEARTBEAT_MESSAGE || "ping";

export const realtimeChannels = {
  notifications: "notifications",
  messages: "messages",
  swaps: "swaps",
  sessions: "sessions",
  dashboards: "dashboards",
};

export function buildWebSocketUrl(channel, params = {}) {
  const url = new URL(`/ws/${channel}/`, DEFAULT_WS_BASE_URL);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
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

export function useRealtimeChannel(channel, params = {}, overrides = {}) {
  return useWebSocket(
    buildWebSocketUrl(channel, params),
    createRealtimeOptions(overrides),
  );
}
