import {
  api,
  fetchAllPages,
  type ApiItemResponse,
  type ApiPaginatedResponse,
} from "@/lib/api/client";
import type { Company, CompanyDetailResponse } from "@/lib/types/company";

export async function getCompaniesPage({
  page = 1,
  pageSize = 100,
  campaignRunId,
  fit,
  priority,
  search,
}: {
  page?: number;
  pageSize?: number;
  campaignRunId?: string;
  fit?: string;
  priority?: string;
  search?: string;
} = {}) {
  const response = await api.get<ApiPaginatedResponse<Company>>("/companies", {
    params: { page, pageSize, campaignRunId, fit, priority, search },
  });
  return response.data;
}

export async function getCompanies(campaignRunId?: string) {
  return fetchAllPages<Company>("/companies", {
    pageSize: 100,
    params: { campaignRunId },
  });
}

export async function getCompanyById(id: string) {
  const response = await api.get<ApiItemResponse<CompanyDetailResponse>>(`/companies/${id}`);
  return response.data.item;
}
