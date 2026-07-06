import { appRuntime } from "@/lib/runtime-config";

export class ApiError extends Error {
  constructor(message, { status, data, url } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
    this.url = url;
  }
}

function extractApiErrorMessage(data, response) {
  function findFirstMessage(value) {
    if (typeof value === "string" && value.trim()) {
      return value;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const nested = findFirstMessage(item);
        if (nested) {
          return nested;
        }
      }
      return null;
    }

    if (value && typeof value === "object") {
      if (typeof value.detail === "string" && value.detail.trim()) {
        return value.detail;
      }

      for (const nestedValue of Object.values(value)) {
        const nested = findFirstMessage(nestedValue);
        if (nested) {
          return nested;
        }
      }
    }

    return null;
  }

  if (typeof data === "string" && data.trim()) {
    return data;
  }

  if (data && typeof data === "object") {
    const nestedMessage = findFirstMessage(data);
    if (nestedMessage) {
      return nestedMessage;
    }
  }

  return `Request failed with status ${response.status}`;
}

export function buildApiUrl(path) {
  const normalizedBase = appRuntime.apiBaseUrl.replace(/\/$/, "");
  const normalizedApiPath = appRuntime.apiBasePath.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${normalizedBase}${normalizedApiPath}${normalizedPath}`;
}

export async function apiRequest(path, options = {}) {
  const url = buildApiUrl(path);
  const response = await fetch(url, {
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...options.headers,
    },
    ...options,
  });

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    throw new ApiError(
      extractApiErrorMessage(data, response),
      {
        status: response.status,
        data,
        url,
      },
    );
  }

  return data;
}
