import { appRuntime } from "@/lib/runtime-config";

const COOLDOWN_SECONDS = 120;

function keyFor(email) {
  const normalizedEmail = (email || "").trim().toLowerCase();
  return `${appRuntime.storagePrefix}:verification-resend:${normalizedEmail}`;
}

export function getVerificationResendCooldown(email) {
  if (typeof window === "undefined" || !email) {
    return 0;
  }

  const rawValue = window.localStorage.getItem(keyFor(email));
  if (!rawValue) {
    return 0;
  }

  const cooldownUntil = Number(rawValue);
  if (!Number.isFinite(cooldownUntil)) {
    window.localStorage.removeItem(keyFor(email));
    return 0;
  }

  const remainingSeconds = Math.max(
    0,
    Math.ceil((cooldownUntil - Date.now()) / 1000),
  );

  if (remainingSeconds === 0) {
    window.localStorage.removeItem(keyFor(email));
  }

  return remainingSeconds;
}

export function startVerificationResendCooldown(
  email,
  seconds = COOLDOWN_SECONDS,
) {
  if (typeof window === "undefined" || !email) {
    return;
  }

  const cooldownUntil = Date.now() + seconds * 1000;
  window.localStorage.setItem(keyFor(email), String(cooldownUntil));
}
