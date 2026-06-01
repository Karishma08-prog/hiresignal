import { api, fetchAllPages, type ApiPaginatedResponse } from "@/lib/api/client";
import type {
  SourceCredential,
  SourceEvidence,
  SourceHealth,
  SourceOverview,
  SourceSlug,
  SourceSupport,
} from "@/lib/types/source";

export async function getSourceOverview() {
  const response = await api.get<ApiPaginatedResponse<SourceOverview>>("/sources/overview", {
    params: { pageSize: 200 },
  });
  return response.data.items;
}

export async function getSourceHealth() {
  return fetchAllPages<SourceHealth>("/sources/health", { pageSize: 50 });
}

export async function getSourceCredentials() {
  return fetchAllPages<SourceCredential>("/sources/credentials", { pageSize: 50 });
}

export async function getSourceSupport() {
  return fetchAllPages<SourceSupport>("/sources/support", { pageSize: 100 });
}

export async function getSourceSlugs(siteKey?: string) {
  return fetchAllPages<SourceSlug>("/sources/slugs", {
    pageSize: 100,
    params: { siteKey },
  });
}

export async function getSourceEvidence(siteKey?: string, runId?: string) {
  return fetchAllPages<SourceEvidence>("/sources/evidence", {
    pageSize: 100,
    params: { siteKey, runId },
  });
}

export async function retestSource(siteKey: string) {
  const response = await api.post<{
    siteKey: string;
    queueJobId: string;
    status: string;
    message: string;
  }>(`/sources/${siteKey}/retest`);
  return response.data;
}

export async function retestAllSources() {
  const response = await api.post<{
    queuedCount: number;
    queueJobIds: string[];
    siteKeys: string[];
    status: string;
    message: string;
  }>("/sources/retest-all");
  return response.data;
}

export async function discoverSourceSlugs(siteKey: string) {
  const response = await api.post<ApiPaginatedResponse<SourceSlug>>(`/sources/${siteKey}/discover-slugs`);
  return response.data.items;
}
