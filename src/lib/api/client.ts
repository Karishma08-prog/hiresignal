import axios from "axios";

function resolveBaseUrl() {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "http://localhost:8000";
  return base.endsWith("/api") ? base : `${base}/api`;
}

export function resolveApiUrl(path: string) {
  return new URL(path, `${resolveBaseUrl()}/`).toString();
}

export const api = axios.create({
  baseURL: resolveBaseUrl(),
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
