export interface Campaign {
  id: string;
  name: string;
  status: string;
  roleQuery: string;
  country: string;
  location: string;
  days: number;
  remoteOnly: boolean;
  resultsPerSource: number;
  titleFilterConfig: {
    includeTitles?: string[];
    excludeTitles?: string[];
    includeKeywords?: string[];
  };
  objectiveFilterConfig: {
    objective?: string;
    targetMarket?: string;
    signals?: string[];
    mode?: string;
  };
  sourceConfig: {
    searchBoards?: string[];
    browserBoards?: string[];
    atsBoards?: string[];
  };
  createdAt: string;
  updatedAt: string;
  lastRunId?: string | null;
}

export interface CampaignRun {
  id: string;
  campaignId: string;
  status: string;
  runMode?: string;
  triggeredBy: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  rawJobCount: number;
  matchedJobCount: number;
  companyCount: number;
  errorCount: number;
  sourceSummary: SourceSummaryItem[];
  runNotes?: string | null;
}

export interface SourceSummaryItem {
  siteKey: string;
  status: string;
  jobsFound: number;
  durationMs?: number | null;
  error?: string | null;
}

export interface RunLog {
  id: string;
  campaignRunId: string;
  sourceKey?: string | null;
  level: string;
  message: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface QueueJob {
  id: string;
  jobType: string;
  status: string;
  runId?: string | null;
  attempts: number;
  maxAttempts: number;
  availableAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  lockedAt?: string | null;
  lastError?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignCreateInput {
  name: string;
  roleQuery: string;
  country: string;
  location: string;
  days: number;
  remoteOnly: boolean;
  resultsPerSource: number;
  titleFilterConfig: Campaign["titleFilterConfig"];
  objectiveFilterConfig: Campaign["objectiveFilterConfig"];
  sourceConfig: Campaign["sourceConfig"];
}

export interface CampaignPresetLaunchInput {
  name: string;
  roleQuery: string;
  country: string;
  location: string;
  days: number;
  remoteOnly: boolean;
  resultsPerSource: number;
  titleFilterConfig: Campaign["titleFilterConfig"];
  objectiveFilterConfig: Campaign["objectiveFilterConfig"];
  triggeredBy?: string;
}

export interface CampaignLaunchResult {
  campaign: Campaign;
  run: CampaignRun;
}
