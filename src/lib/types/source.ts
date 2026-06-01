export interface Source {
  id: string;
  siteKey: string;
  displayName: string;
  category: string;
  engine: string;
  region: string;
  requiresCompanySlug: boolean;
  requiresApiKey: boolean;
  riskLevel: string;
  notes?: string | null;
}

export interface SourceHealth {
  siteKey: string;
  status: string;
  lastSuccessAt?: string | null;
  lastErrorAt?: string | null;
  lastErrorMessage?: string | null;
  avgResults7d: number;
  avgLatencyMs7d: number;
  successRate7d: number;
  lastRunJobsFound: number;
}

export interface SourceCredential {
  siteKey: string;
  needsApiKey: boolean;
  needsProxy: boolean;
  needsCompanySlug: boolean;
  credentialPresent: boolean;
  credentialVerifiedAt?: string | null;
  workingStatus: string;
  credentialNote?: string | null;
}

export interface SourceOverview {
  siteKey: string;
  displayName: string;
  category: string;
  engine: string;
  region: string;
  status: string;
  supportTier: string;
  supportReason?: string | null;
  clientVisible: boolean;
  lastSuccessAt?: string | null;
  lastErrorAt?: string | null;
  lastErrorMessage?: string | null;
  avgResults7d: number;
  avgLatencyMs7d: number;
  successRate7d: number;
  lastRunJobsFound: number;
  needsApiKey: boolean;
  needsProxy: boolean;
  needsCompanySlug: boolean;
  credentialPresent: boolean;
  credentialVerifiedAt?: string | null;
  workingStatus: string;
  credentialNote?: string | null;
  notes?: string | null;
}

export interface SourceSupport {
  siteKey: string;
  supportTier: string;
  supportReason?: string | null;
  clientVisible: boolean;
  ownedBy?: string | null;
  lastPolicyReviewAt?: string | null;
}

export interface SourceSlug {
  id: string;
  siteKey: string;
  companySlug: string;
  companyName?: string | null;
  jobBoardUrl?: string | null;
  discoveryMethod?: string | null;
  status: string;
  lastDiscoveredAt?: string | null;
  lastVerifiedAt?: string | null;
  lastError?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SourceEvidence {
  id: string;
  siteKey: string;
  runId?: string | null;
  evidenceType: string;
  jobsFound: number;
  querySignature?: string | null;
  country?: string | null;
  location?: string | null;
  succeeded: boolean;
  details: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
