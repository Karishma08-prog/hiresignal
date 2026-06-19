import {
  api,
  fetchAllPages,
  type ApiItemResponse,
  type ApiPaginatedResponse,
} from "@/lib/api/client";
import type { Artifact, Report } from "@/lib/types/report";

export async function getReports(pageSize = 100) {
  const response = await api.get<ApiPaginatedResponse<Report>>("/reports", {
    params: { pageSize },
  });
  return response.data.items;
}

export async function getAllReports() {
  return fetchAllPages<Report>("/reports", { pageSize: 100 });
}

export async function getReportById(id: string) {
  const response = await api.get<ApiItemResponse<Report>>(`/reports/${id}`);
  return response.data.item;
}

export async function getArtifactById(id: string) {
  const response = await api.get<ApiItemResponse<Artifact>>(`/artifacts/${id}`);
  return response.data.item;
}

export async function downloadArtifactById(id: string) {
  const artifact = await getArtifactById(id);
  const response = await api.get<Blob>(`/artifacts/${id}/download`, {
    responseType: "blob",
  });

  const objectUrl = window.URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = artifact.fileName || `${id}.bin`;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(objectUrl);

  return artifact.fileName;
}
