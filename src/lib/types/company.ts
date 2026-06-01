export interface Company {
  id: string;
  name: string;
  website?: string | null;
  domain?: string | null;
  industry?: string | null;
  location?: string | null;
  description?: string | null;
  openRoles: number;
  status: string;
  revEngineerFit: string;
  priority: string;
  objectiveSignal?: string | null;
  titleMatch?: string | null;
  daysActive: number;
  source?: string | null;
  webEvidence?: string | null;
  webSources: string[];
  jobCount: number;
}

export interface CompanySignal {
  objectiveScore: number;
  objectiveClassification: string;
  matchedSignals: string[];
  evidenceSnippet?: string | null;
}

export interface CompanyDetailResponse {
  company: Company;
  jobs: {
    id: string;
    title: string;
    site: string;
    engine: string;
    location?: string | null;
    datePosted?: string | null;
    jobUrl: string;
    matchedTitle: boolean;
    matchedObjective: boolean;
  }[];
  signals?: CompanySignal | null;
}
