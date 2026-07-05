import { ApiError, apiRequest } from "@/lib/http-client";
import { appRuntime } from "@/lib/runtime-config";

const storage =
  typeof window === "undefined"
    ? new Map()
    : window.localStorage;

function getStorageValue(key) {
  if (storage instanceof Map) {
    return storage.get(key) ?? null;
  }
  return storage.getItem(key);
}

function setStorageValue(key, value) {
  if (storage instanceof Map) {
    storage.set(key, value);
    return;
  }
  storage.setItem(key, value);
}

function removeStorageValue(key) {
  if (storage instanceof Map) {
    storage.delete(key);
    return;
  }
  storage.removeItem(key);
}

const accessTokenKey = `${appRuntime.storagePrefix}:${appRuntime.storageKeys.token}`;
const refreshTokenKey = `${appRuntime.storagePrefix}:${appRuntime.storageKeys.refreshToken}`;

function getAccessToken() {
  return getStorageValue(accessTokenKey);
}

function getRefreshToken() {
  return getStorageValue(refreshTokenKey);
}

function storeTokens({ access, refresh }) {
  if (access) {
    setStorageValue(accessTokenKey, access);
  }
  if (refresh) {
    setStorageValue(refreshTokenKey, refresh);
  }
}

function clearTokens() {
  removeStorageValue(accessTokenKey);
  removeStorageValue(refreshTokenKey);
}

function jsonRequestOptions(payload) {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  };
}

async function refreshAccessToken() {
  const refresh = getRefreshToken();
  if (!refresh) {
    throw new ApiError("Authentication required", { status: 401 });
  }

  try {
    const data = await apiRequest(
      "/auth/jwt/refresh/",
      jsonRequestOptions({ refresh }),
    );
    storeTokens({ access: data.access, refresh });
    return data.access;
  } catch (error) {
    clearTokens();
    throw error;
  }
}

async function authenticatedRequest(path, options = {}, retryOnUnauthorized = true) {
  let access = getAccessToken();
  if (!access && getRefreshToken()) {
    access = await refreshAccessToken();
  }
  if (!access) {
    throw new ApiError("Authentication required", { status: 401 });
  }

  try {
    return await apiRequest(path, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${access}`,
      },
    });
  } catch (error) {
    if (
      retryOnUnauthorized &&
      error instanceof ApiError &&
      error.status === 401 &&
      getRefreshToken()
    ) {
      const nextAccess = await refreshAccessToken();
      return apiRequest(path, {
        ...options,
        headers: {
          ...(options.headers || {}),
          Authorization: `Bearer ${nextAccess}`,
        },
      });
    }
    throw error;
  }
}

export const backendAuthClient = {
  async me() {
    return authenticatedRequest("/auth/me/", { method: "GET" });
  },

  async loginViaEmailPassword(email, password) {
    const data = await apiRequest(
      "/auth/jwt/token/",
      jsonRequestOptions({ email, password }),
    );
    storeTokens(data);
    return data.user;
  },

  async register({ email, password, fullName = "" }) {
    return apiRequest(
      "/auth/register/",
      jsonRequestOptions({
        email,
        password,
        ...(fullName ? { full_name: fullName } : {}),
      }),
    );
  },

  async verifyEmail({ email, code }) {
    const data = await apiRequest(
      "/auth/verify-email/",
      jsonRequestOptions({ email, code }),
    );
    storeTokens(data);
    return data;
  },

  async resendVerification(email) {
    return apiRequest(
      "/auth/resend-verification/",
      jsonRequestOptions({ email }),
    );
  },

  async requestPasswordReset(email) {
    return apiRequest(
      "/auth/password-reset/request/",
      jsonRequestOptions({ email }),
    );
  },

  async resetPassword({ token, newPassword }) {
    return apiRequest(
      "/auth/password-reset/confirm/",
      jsonRequestOptions({
        token,
        new_password: newPassword,
      }),
    );
  },

  async logout(redirectPath) {
    const refresh = getRefreshToken();
    try {
      if (refresh) {
        await authenticatedRequest(
          "/auth/logout/",
          jsonRequestOptions({ refresh }),
          false,
        );
      }
    } catch {
      // Clear local auth state even if the server token is already invalid.
    } finally {
      clearTokens();
      if (typeof window !== "undefined" && redirectPath) {
        window.location.href = redirectPath;
      }
    }
  },

  loginWithProvider() {
    throw new ApiError(
      "Google sign-in is not available in backend API mode yet.",
      { status: 501 },
    );
  },

  redirectToLogin(fromUrl) {
    if (typeof window !== "undefined") {
      const target = fromUrl
        ? `/login?from=${encodeURIComponent(fromUrl)}`
        : "/login";
      window.location.href = target;
    }
  },

  setToken(token) {
    storeTokens({ access: token });
  },

  clearTokens,
};
