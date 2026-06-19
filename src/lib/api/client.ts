import axios from "axios";

function resolveBaseUrl() {
  if (typeof window !== "undefined") {
    return "/api";
  }

  const configuredBase = (
    process.env.HIRESIGNAL_INTERNAL_API_BASE_URL?.trim()
    || process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
  );
  const base = configuredBase && !configuredBase.includes("hiresignal.example.com")
    ? configuredBase
    : "http://127.0.0.1:8000";
  return base.endsWith("/api") ? base : `${base}/api`;
}

function resolveBearerToken() {
  if (typeof window !== "undefined") {
    return undefined;
  }

  const token = (
    process.env.HIRESIGNAL_API_TOKEN?.trim()
    || process.env.NEXT_PUBLIC_HIRESIGNAL_API_TOKEN?.trim()
  );
  return token ? `Bearer ${token}` : undefined;
}

export function resolveApiUrl(path: string) {
  if (typeof window !== "undefined") {
    return path.startsWith("/api/") ? path : `/api/${path.replace(/^\/+/, "")}`;
  }

  return new URL(path, `${resolveBaseUrl()}/`).toString();
}

export const api = axios.create({
  baseURL: resolveBaseUrl(),
});

api.interceptors.request.use((config) => {
  const token = resolveBearerToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = token;
  }
  return config;
});

export interface ApiItemResponse<T> {
  item: T;
}

export interface ApiPaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export async function fetchAllPages<T>(
  path: string,
  {
    pageSize,
    params,
  }: {
    pageSize: number;
    params?: Record<string, string | number | boolean | undefined>;
  },
) {
  const items: T[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const response = await api.get<ApiPaginatedResponse<T>>(path, {
      params: { ...params, page, pageSize },
    });
    items.push(...response.data.items);
    totalPages = response.data.totalPages;
    page += 1;
  } while (page <= totalPages);

  return items;
}
