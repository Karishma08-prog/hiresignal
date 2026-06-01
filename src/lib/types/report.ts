export interface Report {
  id: string;
  campaignRunId: string;
  name: string;
  type: string;
  status: string;
  focus?: string | null;
  metric?: string | null;
  summary?: string | null;
  generatedAt?: string | null;
  artifactIds: string[];
}

export interface Artifact {
  id: string;
  reportId: string;
  kind: string;
  fileName: string;
  mimeType: string;
  downloadUrl: string;
  createdAt: string;
}
