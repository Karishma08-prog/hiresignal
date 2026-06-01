import { api, type ApiPaginatedResponse } from "@/lib/api/client";

export interface JobListItem {
  id: string;
  campaignRunId: string;
  companyId?: string | null;
  site: string;
  engine: string;
  externalId?: string | null;
  jobUrl: string;
  title: string;
  companyName: string;
  location?: string | null;
  datePosted?: string | null;
  jobType?: string | null;
  isRemote: boolean;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string | null;
  description?: string | null;
  normalizedHash?: string | null;
  matchedTitle: boolean;
  matchedObjective: boolean;
}

export async function getJobs(campaignRunId?: string) {
  const response = await api.get<ApiPaginatedResponse<JobListItem>>("/jobs", {
    params: { pageSize: 200, campaignRunId },
  });
  return response.data.items;
}
