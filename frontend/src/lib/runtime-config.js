const APP_MODES = {
  LOCAL_DEMO: "local-demo",
  BACKEND_API: "backend-api",
};

const rawAppMode = import.meta.env.VITE_APP_MODE || APP_MODES.LOCAL_DEMO;
const appMode = Object.values(APP_MODES).includes(rawAppMode)
  ? rawAppMode
  : APP_MODES.LOCAL_DEMO;

const storagePrefix = import.meta.env.VITE_APP_STORAGE_KEY || "skillverse-local";

export const appRuntime = {
  modes: APP_MODES,
  appMode,
  appId: import.meta.env.VITE_APP_ID || storagePrefix,
  storagePrefix,
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
  apiBasePath: import.meta.env.VITE_API_BASE_PATH || "/api",
  wsBaseUrl: import.meta.env.VITE_WS_BASE_URL || "ws://localhost:8000",
  wsHeartbeatMessage: import.meta.env.VITE_WS_HEARTBEAT_MESSAGE || "ping",
  maxUploadMb: Number(import.meta.env.VITE_MAX_UPLOAD_MB || 25),
  demo: {
    autoLogin: import.meta.env.VITE_DEMO_AUTO_LOGIN !== "false",
    email: import.meta.env.VITE_DEMO_EMAIL || "demo@skillverse.local",
    password: import.meta.env.VITE_DEMO_PASSWORD || "SkillVerse123!",
    otp: import.meta.env.VITE_DEMO_OTP || "123456",
  },
  storageKeys: {
    currentUserId: "currentUserId",
    pendingRegistration: "pendingRegistration",
    seeded: "seeded",
    token: "token",
    users: "users",
    entities: "entities",
  },
};

export function isBackendApiMode() {
  return appRuntime.appMode === APP_MODES.BACKEND_API;
}

export function isLocalDemoMode() {
  return appRuntime.appMode === APP_MODES.LOCAL_DEMO;
}
