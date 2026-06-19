import {
  api,
  fetchAllPages,
  type ApiItemResponse,
  type ApiPaginatedResponse,
} from "@/lib/api/client";
import type {
  Campaign,
  CampaignCreateInput,
  CampaignLaunchResult,
  CampaignPresetLaunchInput,
  CampaignRun,
  QueueJob,
  RunLog,
} from "@/lib/types/campaign";
import type { Company } from "@/lib/types/company";

export async function getCampaigns(pageSize = 100) {
  const response = await api.get<ApiPaginatedResponse<Campaign>>("/campaigns", {
    params: { pageSize },
  });
  return response.data.items;
}

export async function getAllCampaigns() {
  return fetchAllPages<Campaign>("/campaigns", { pageSize: 100 });
}

export async function getCampaignById(id: string) {
  const response = await api.get<ApiItemResponse<Campaign>>(`/campaigns/${id}`);
  return response.data.item;
}

export async function createCampaign(payload: CampaignCreateInput) {
  const response = await api.post<ApiItemResponse<Campaign>>("/campaigns", payload);
  return response.data.item;
}

export async function launchFreeZeroConfigCampaign(payload: CampaignPresetLaunchInput) {
  const response = await api.post<ApiItemResponse<CampaignLaunchResult>>(
    "/campaigns/presets/free-zero-config",
    payload,
  );
  return response.data.item;
}

export async function triggerCampaignRun(campaignId: string) {
  const response = await api.post<ApiItemResponse<CampaignRun>>(
    `/campaigns/${campaignId}/run`,
    { triggeredBy: "frontend" },
  );
  return response.data.item;
}

export async function getCampaignRun(runId: string) {
  const response = await api.get<ApiItemResponse<CampaignRun>>(`/campaign-runs/${runId}`);
  return response.data.item;
}

export async function getCampaignRuns(campaignId?: string, pageSize = 100) {
  const response = await api.get<ApiPaginatedResponse<CampaignRun>>("/campaign-runs", {
    params: { pageSize, campaignId },
  });
  return response.data.items;
}

export async function getAllCampaignRuns(campaignId?: string) {
  return fetchAllPages<CampaignRun>("/campaign-runs", {
    pageSize: 100,
    params: { campaignId },
  });
}

export async function getRunCompanies(runId: string) {
  return fetchAllPages<Company>(`/campaign-runs/${runId}/companies`, { pageSize: 100 });
}

export async function getRunJobs(runId: string) {
  return fetchAllPages<{
    id: string;
    campaignRunId: string;
    companyId?: string | null;
    title: string;
    companyName: string;
    location?: string | null;
    site: string;
    datePosted?: string | null;
    matchedTitle: boolean;
    matchedObjective: boolean;
    jobUrl: string;
  }>(`/campaign-runs/${runId}/jobs`, {
    pageSize: 100,
  });
}

export async function getRunLogs(runId: string, pageSize = 200) {
  const response = await api.get<ApiPaginatedResponse<RunLog>>(`/campaign-runs/${runId}/logs`, {
    params: { pageSize },
  });
  return response.data.items;
}

export async function getRunQueue(runId: string) {
  const response = await api.get<ApiItemResponse<QueueJob>>(`/campaign-runs/${runId}/queue`);
  return response.data.item;
}
