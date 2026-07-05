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
      typeof data === "object" && data?.detail
        ? data.detail
        : `Request failed with status ${response.status}`,
      {
        status: response.status,
        data,
        url,
      },
    );
  }

  return data;
}
