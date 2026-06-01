from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class OrmModel(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class PaginatedResponse(BaseModel):
    items: list[Any]
    page: int
    pageSize: int
    total: int
    totalPages: int


class CampaignCreate(BaseModel):
    name: str
    roleQuery: str
    country: str
    location: str
    days: int = 30
    remoteOnly: bool = False
    resultsPerSource: int = 25
    titleFilterConfig: dict = Field(default_factory=dict)
    objectiveFilterConfig: dict = Field(default_factory=dict)
    sourceConfig: dict = Field(default_factory=dict)


class CampaignPresetLaunch(BaseModel):
    name: str
    roleQuery: str
    country: str
    location: str
    days: int = 30
    remoteOnly: bool = False
    resultsPerSource: int = 25
    titleFilterConfig: dict = Field(default_factory=dict)
    objectiveFilterConfig: dict = Field(default_factory=dict)
    triggeredBy: str = "frontend_preset"


class CampaignUpdate(BaseModel):
    name: str | None = None
    roleQuery: str | None = None
    country: str | None = None
    location: str | None = None
    days: int | None = None
    remoteOnly: bool | None = None
    resultsPerSource: int | None = None
    titleFilterConfig: dict | None = None
    objectiveFilterConfig: dict | None = None
    sourceConfig: dict | None = None
    status: str | None = None


class CampaignRead(OrmModel):
    id: str
    name: str
    roleQuery: str = Field(alias="role_query")
    country: str
    location: str
    days: int
    remoteOnly: bool = Field(alias="remote_only")
    resultsPerSource: int = Field(alias="results_per_source")
    status: str
    titleFilterConfig: dict = Field(alias="title_filter_config")
    objectiveFilterConfig: dict = Field(alias="objective_filter_config")
    sourceConfig: dict = Field(alias="source_config")
    createdAt: datetime = Field(alias="created_at")
    updatedAt: datetime = Field(alias="updated_at")
    lastRunId: str | None = Field(alias="last_run_id")


class RunTrigger(BaseModel):
    triggeredBy: str = "manual"


class SourceSummaryItem(BaseModel):
    siteKey: str
    status: str
    jobsFound: int
    durationMs: int | None = None
    error: str | None = None


class CampaignRunRead(OrmModel):
    id: str
    campaignId: str = Field(alias="campaign_id")
    status: str
    runMode: str | None = None
    triggeredBy: str = Field(alias="triggered_by")
    startedAt: datetime | None = Field(alias="started_at")
    finishedAt: datetime | None = Field(alias="finished_at")
    rawJobCount: int = Field(alias="raw_job_count")
    matchedJobCount: int = Field(alias="matched_job_count")
    companyCount: int = Field(alias="company_count")
    errorCount: int = Field(alias="error_count")
    sourceSummary: list[dict] = Field(alias="source_summary")
    runNotes: str | None = Field(default=None, alias="run_notes")


class JobRead(OrmModel):
    id: str
    campaignRunId: str = Field(alias="campaign_run_id")
    companyId: str | None = Field(alias="company_id")
    site: str
    engine: str
    externalId: str | None = Field(alias="external_id")
    jobUrl: str = Field(alias="job_url")
    title: str
    companyName: str = Field(alias="company_name")
    location: str | None
    datePosted: str | None = Field(alias="date_posted")
    jobType: str | None = Field(alias="job_type")
    isRemote: bool = Field(alias="is_remote")
    salaryMin: float | None = Field(alias="salary_min")
    salaryMax: float | None = Field(alias="salary_max")
    currency: str | None
    description: str | None
    normalizedHash: str | None = Field(alias="normalized_hash")
    matchedTitle: bool = Field(alias="matched_title")
    matchedObjective: bool = Field(alias="matched_objective")


class CompanyRead(OrmModel):
    id: str
    name: str
    website: str | None
    domain: str | None
    industry: str | None
    location: str | None
    description: str | None
    openRoles: int = Field(alias="open_roles")
    status: str
    revEngineerFit: str = Field(alias="revengineer_fit")
    priority: str
    objectiveSignal: str | None = Field(alias="objective_signal")
    titleMatch: str | None = Field(alias="title_match")
    daysActive: int = Field(alias="days_active")
    source: str | None
    webEvidence: str | None = Field(alias="web_evidence")
    webSources: list = Field(alias="web_sources")
    jobCount: int = Field(default=0, alias="job_count")


class CompanySignalRead(OrmModel):
    objectiveScore: int = Field(alias="objective_score")
    objectiveClassification: str = Field(alias="objective_classification")
    matchedSignals: list = Field(alias="matched_signals")
    evidenceSnippet: str | None = Field(alias="evidence_snippet")


class CompanyDetailResponse(BaseModel):
    company: CompanyRead
    jobs: list[JobRead]
    signals: CompanySignalRead | None = None


class SourceRead(OrmModel):
    id: str
    siteKey: str = Field(alias="site_key")
    displayName: str = Field(alias="display_name")
    category: str
    engine: str
    region: str
    requiresCompanySlug: bool = Field(alias="requires_company_slug")
    requiresApiKey: bool = Field(alias="requires_api_key")
    riskLevel: str = Field(alias="risk_level")
    notes: str | None


class SourceHealthRead(OrmModel):
    siteKey: str = Field(alias="site_key")
    status: str
    lastSuccessAt: datetime | None = Field(alias="last_success_at")
    lastErrorAt: datetime | None = Field(alias="last_error_at")
    lastErrorMessage: str | None = Field(alias="last_error_message")
    avgResults7d: float = Field(alias="avg_results_7d")
    avgLatencyMs7d: float = Field(alias="avg_latency_ms_7d")
    successRate7d: float = Field(alias="success_rate_7d")
    lastRunJobsFound: int = Field(alias="last_run_jobs_found")


class SourceCredentialRead(OrmModel):
    siteKey: str = Field(alias="site_key")
    needsApiKey: bool = Field(alias="needs_api_key")
    needsProxy: bool = Field(alias="needs_proxy")
    needsCompanySlug: bool = Field(alias="needs_company_slug")
    credentialPresent: bool = Field(alias="credential_present")
    credentialVerifiedAt: datetime | None = Field(alias="credential_verified_at")
    workingStatus: str = Field(alias="working_status")
    credentialNote: str | None = Field(alias="credential_note")


class SourceSupportRead(OrmModel):
    siteKey: str = Field(alias="site_key")
    supportTier: str = Field(alias="support_tier")
    supportReason: str | None = Field(alias="support_reason")
    clientVisible: bool = Field(alias="client_visible")
    ownedBy: str | None = Field(alias="owned_by")
    lastPolicyReviewAt: datetime | None = Field(alias="last_policy_review_at")


class SourceSlugRead(OrmModel):
    id: str
    siteKey: str = Field(alias="site_key")
    companySlug: str = Field(alias="company_slug")
    companyName: str | None = Field(alias="company_name")
    jobBoardUrl: str | None = Field(alias="job_board_url")
    discoveryMethod: str | None = Field(alias="discovery_method")
    status: str
    lastDiscoveredAt: datetime | None = Field(alias="last_discovered_at")
    lastVerifiedAt: datetime | None = Field(alias="last_verified_at")
    lastError: str | None = Field(alias="last_error")
    notes: str | None
    createdAt: datetime = Field(alias="created_at")
    updatedAt: datetime = Field(alias="updated_at")


class SourceEvidenceRead(OrmModel):
    id: str
    siteKey: str = Field(alias="site_key")
    runId: str | None = Field(alias="run_id")
    evidenceType: str = Field(alias="evidence_type")
    jobsFound: int = Field(alias="jobs_found")
    querySignature: str | None = Field(alias="query_signature")
    country: str | None
    location: str | None
    succeeded: bool
    details: dict = Field(alias="details_json")
    createdAt: datetime = Field(alias="created_at")
    updatedAt: datetime = Field(alias="updated_at")


class SourceOverviewRead(BaseModel):
    siteKey: str
    displayName: str
    category: str
    engine: str
    region: str
    status: str
    supportTier: str = "experimental"
    supportReason: str | None = None
    clientVisible: bool = True
    lastSuccessAt: datetime | None = None
    lastErrorAt: datetime | None = None
    lastErrorMessage: str | None = None
    avgResults7d: float = 0
    avgLatencyMs7d: float = 0
    successRate7d: float = 0
    lastRunJobsFound: int = 0
    needsApiKey: bool = False
    needsProxy: bool = False
    needsCompanySlug: bool = False
    credentialPresent: bool = False
    credentialVerifiedAt: datetime | None = None
    workingStatus: str = "unknown"
    credentialNote: str | None = None
    notes: str | None = None
    memberSiteKeys: list[str] = Field(default_factory=list)
    memberCount: int = 1


class SourceRetestRead(BaseModel):
    siteKey: str
    queueJobId: str
    status: str
    message: str


class SourceRetestBatchRead(BaseModel):
    queuedCount: int
    queueJobIds: list[str]
    siteKeys: list[str]
    status: str
    message: str


class ReportRead(OrmModel):
    id: str
    campaignRunId: str = Field(alias="campaign_run_id")
    name: str
    type: str = Field(alias="report_type")
    status: str
    focus: str | None
    metric: str | None
    summary: str | None
    generatedAt: datetime | None = Field(alias="generated_at")
    artifactIds: list[str] = Field(default_factory=list, alias="artifact_ids")


class ArtifactRead(OrmModel):
    id: str
    reportId: str = Field(alias="report_id")
    kind: str
    fileName: str = Field(alias="file_name")
    mimeType: str = Field(alias="mime_type")
    downloadUrl: str = Field(alias="download_url")
    createdAt: datetime = Field(alias="created_at")


class RunLogRead(OrmModel):
    id: str
    campaignRunId: str = Field(alias="campaign_run_id")
    sourceKey: str | None = Field(alias="source_key")
    level: str
    message: str
    details: dict = Field(alias="details_json")
    createdAt: datetime = Field(alias="created_at")


class QueueJobRead(OrmModel):
    id: str
    jobType: str = Field(alias="job_type")
    status: str
    runId: str | None = Field(alias="run_id")
    attempts: int
    maxAttempts: int = Field(alias="max_attempts")
    availableAt: datetime = Field(alias="available_at")
    startedAt: datetime | None = Field(alias="started_at")
    finishedAt: datetime | None = Field(alias="finished_at")
    lockedAt: datetime | None = Field(alias="locked_at")
    lastError: str | None = Field(alias="last_error")
    createdAt: datetime = Field(alias="created_at")
    updatedAt: datetime = Field(alias="updated_at")


class ItemResponse(BaseModel):
    item: Any


class CampaignLaunchRead(BaseModel):
    campaign: CampaignRead
    run: CampaignRunRead
