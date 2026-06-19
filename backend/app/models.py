from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, LargeBinary, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String, default="admin")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    sessions: Mapped[list["UserSession"]] = relationship(back_populates="user")


class UserSession(Base, TimestampMixin):
    __tablename__ = "user_sessions"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    token_hash: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    user: Mapped["User"] = relationship(back_populates="sessions")


class Campaign(Base, TimestampMixin):
    __tablename__ = "campaigns"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    role_query: Mapped[str] = mapped_column(String, nullable=False)
    country: Mapped[str] = mapped_column(String, nullable=False)
    location: Mapped[str] = mapped_column(String, nullable=False)
    days: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    remote_only: Mapped[bool] = mapped_column(Boolean, default=False)
    results_per_source: Mapped[int] = mapped_column(Integer, default=100)
    status: Mapped[str] = mapped_column(String, default="draft")
    title_filter_config: Mapped[dict] = mapped_column(JSON, default=dict)
    objective_filter_config: Mapped[dict] = mapped_column(JSON, default=dict)
    source_config: Mapped[dict] = mapped_column(JSON, default=dict)
    last_run_id: Mapped[str | None] = mapped_column(String, nullable=True)

    runs: Mapped[list["CampaignRun"]] = relationship(back_populates="campaign")


class CampaignRun(Base):
    __tablename__ = "campaign_runs"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    campaign_id: Mapped[str] = mapped_column(ForeignKey("campaigns.id"), nullable=False)
    status: Mapped[str] = mapped_column(String, default="queued")
    triggered_by: Mapped[str] = mapped_column(String, default="manual")
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    raw_job_count: Mapped[int] = mapped_column(Integer, default=0)
    matched_job_count: Mapped[int] = mapped_column(Integer, default=0)
    company_count: Mapped[int] = mapped_column(Integer, default=0)
    error_count: Mapped[int] = mapped_column(Integer, default=0)
    source_summary: Mapped[list] = mapped_column(JSON, default=list)
    run_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    campaign: Mapped["Campaign"] = relationship(back_populates="runs")
    jobs: Mapped[list["Job"]] = relationship(back_populates="campaign_run")
    company_signals: Mapped[list["CompanySignal"]] = relationship(back_populates="campaign_run")
    reports: Mapped[list["Report"]] = relationship(back_populates="campaign_run")


class Company(Base, TimestampMixin):
    __tablename__ = "companies"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    website: Mapped[str | None] = mapped_column(String, nullable=True)
    domain: Mapped[str | None] = mapped_column(String, nullable=True)
    industry: Mapped[str | None] = mapped_column(String, nullable=True)
    location: Mapped[str | None] = mapped_column(String, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    open_roles: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String, default="active")
    revengineer_fit: Mapped[str] = mapped_column(String, default="medium")
    priority: Mapped[str] = mapped_column(String, default="medium")
    objective_signal: Mapped[str | None] = mapped_column(Text, nullable=True)
    title_match: Mapped[str | None] = mapped_column(String, nullable=True)
    days_active: Mapped[int] = mapped_column(Integer, default=0)
    source: Mapped[str | None] = mapped_column(String, nullable=True)
    web_evidence: Mapped[str | None] = mapped_column(Text, nullable=True)
    web_sources: Mapped[list] = mapped_column(JSON, default=list)

    jobs: Mapped[list["Job"]] = relationship(back_populates="company")
    signals: Mapped[list["CompanySignal"]] = relationship(back_populates="company")

    @property
    def job_count(self) -> int:
        return int(self.open_roles or 0)


class Job(Base, TimestampMixin):
    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    campaign_run_id: Mapped[str] = mapped_column(ForeignKey("campaign_runs.id"), nullable=False)
    company_id: Mapped[str | None] = mapped_column(ForeignKey("companies.id"), nullable=True)
    site: Mapped[str] = mapped_column(String, nullable=False)
    engine: Mapped[str] = mapped_column(String, nullable=False)
    external_id: Mapped[str | None] = mapped_column(String, nullable=True)
    job_url: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    company_name: Mapped[str] = mapped_column(String, nullable=False)
    location: Mapped[str | None] = mapped_column(String, nullable=True)
    date_posted: Mapped[str | None] = mapped_column(String, nullable=True)
    job_type: Mapped[str | None] = mapped_column(String, nullable=True)
    is_remote: Mapped[bool] = mapped_column(Boolean, default=False)
    salary_min: Mapped[float | None] = mapped_column(Float, nullable=True)
    salary_max: Mapped[float | None] = mapped_column(Float, nullable=True)
    currency: Mapped[str | None] = mapped_column(String, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    normalized_hash: Mapped[str | None] = mapped_column(String, nullable=True)
    matched_title: Mapped[bool] = mapped_column(Boolean, default=False)
    matched_objective: Mapped[bool] = mapped_column(Boolean, default=False)
    raw_payload_json: Mapped[dict] = mapped_column(JSON, default=dict)

    campaign_run: Mapped["CampaignRun"] = relationship(back_populates="jobs")
    company: Mapped["Company | None"] = relationship(back_populates="jobs")


class CompanySignal(Base, TimestampMixin):
    __tablename__ = "company_signals"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    company_id: Mapped[str] = mapped_column(ForeignKey("companies.id"), nullable=False)
    campaign_run_id: Mapped[str] = mapped_column(ForeignKey("campaign_runs.id"), nullable=False)
    objective_score: Mapped[int] = mapped_column(Integer, default=0)
    objective_classification: Mapped[str] = mapped_column(String, default="unlikely")
    matched_signals: Mapped[list] = mapped_column(JSON, default=list)
    evidence_snippet: Mapped[str | None] = mapped_column(Text, nullable=True)

    company: Mapped["Company"] = relationship(back_populates="signals")
    campaign_run: Mapped["CampaignRun"] = relationship(back_populates="company_signals")


class Source(Base):
    __tablename__ = "sources"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    site_key: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String, nullable=False)
    category: Mapped[str] = mapped_column(String, nullable=False)
    engine: Mapped[str] = mapped_column(String, nullable=False)
    region: Mapped[str] = mapped_column(String, nullable=False)
    requires_company_slug: Mapped[bool] = mapped_column(Boolean, default=False)
    requires_api_key: Mapped[bool] = mapped_column(Boolean, default=False)
    risk_level: Mapped[str] = mapped_column(String, default="secondary")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    health_entries: Mapped[list["SourceHealth"]] = relationship(back_populates="source")
    credentials: Mapped[list["SourceCredential"]] = relationship(back_populates="source")


class SourceHealth(Base):
    __tablename__ = "source_health"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    site_key: Mapped[str] = mapped_column(ForeignKey("sources.site_key"), nullable=False)
    status: Mapped[str] = mapped_column(String, default="ready")
    last_success_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_error_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    avg_results_7d: Mapped[float] = mapped_column(Float, default=0)
    avg_latency_ms_7d: Mapped[float] = mapped_column(Float, default=0)
    success_rate_7d: Mapped[float] = mapped_column(Float, default=0)
    last_run_jobs_found: Mapped[int] = mapped_column(Integer, default=0)

    source: Mapped["Source"] = relationship(back_populates="health_entries")


class SourceCredential(Base):
    __tablename__ = "source_credentials"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    site_key: Mapped[str] = mapped_column(ForeignKey("sources.site_key"), nullable=False)
    needs_api_key: Mapped[bool] = mapped_column(Boolean, default=False)
    needs_proxy: Mapped[bool] = mapped_column(Boolean, default=False)
    needs_company_slug: Mapped[bool] = mapped_column(Boolean, default=False)
    credential_present: Mapped[bool] = mapped_column(Boolean, default=False)
    credential_verified_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    working_status: Mapped[str] = mapped_column(String, default="unknown")
    credential_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    source: Mapped["Source"] = relationship(back_populates="credentials")


class SourceSupport(Base):
    __tablename__ = "source_support"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    site_key: Mapped[str] = mapped_column(ForeignKey("sources.site_key"), unique=True, nullable=False)
    support_tier: Mapped[str] = mapped_column(String, default="experimental")
    support_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    client_visible: Mapped[bool] = mapped_column(Boolean, default=True)
    owned_by: Mapped[str | None] = mapped_column(String, nullable=True)
    last_policy_review_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    source: Mapped["Source"] = relationship()


class SourceSlug(Base, TimestampMixin):
    __tablename__ = "source_slugs"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    site_key: Mapped[str] = mapped_column(ForeignKey("sources.site_key"), nullable=False, index=True)
    company_slug: Mapped[str] = mapped_column(String, nullable=False)
    company_name: Mapped[str | None] = mapped_column(String, nullable=True)
    job_board_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    discovery_method: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, default="discovered")
    last_discovered_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_verified_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    source: Mapped["Source"] = relationship()


class SourceEvidence(Base, TimestampMixin):
    __tablename__ = "source_evidence"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    site_key: Mapped[str] = mapped_column(ForeignKey("sources.site_key"), nullable=False, index=True)
    run_id: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    evidence_type: Mapped[str] = mapped_column(String, nullable=False)
    jobs_found: Mapped[int] = mapped_column(Integer, default=0)
    query_signature: Mapped[str | None] = mapped_column(String, nullable=True)
    country: Mapped[str | None] = mapped_column(String, nullable=True)
    location: Mapped[str | None] = mapped_column(String, nullable=True)
    succeeded: Mapped[bool] = mapped_column(Boolean, default=False)
    details_json: Mapped[dict] = mapped_column(JSON, default=dict)

    source: Mapped["Source"] = relationship()


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    campaign_run_id: Mapped[str] = mapped_column(ForeignKey("campaign_runs.id"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    report_type: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, default="queued")
    focus: Mapped[str | None] = mapped_column(String, nullable=True)
    metric: Mapped[str | None] = mapped_column(String, nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    generated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    campaign_run: Mapped["CampaignRun"] = relationship(back_populates="reports")
    artifacts: Mapped[list["Artifact"]] = relationship(back_populates="report")

    @property
    def artifact_ids(self) -> list[str]:
        return [artifact.id for artifact in self.artifacts or []]


class Artifact(Base):
    __tablename__ = "artifacts"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    report_id: Mapped[str] = mapped_column(ForeignKey("reports.id"), nullable=False)
    kind: Mapped[str] = mapped_column(String, nullable=False)
    file_name: Mapped[str] = mapped_column(String, nullable=False)
    mime_type: Mapped[str] = mapped_column(String, nullable=False)
    file_path: Mapped[str] = mapped_column(Text, nullable=False)
    storage_backend: Mapped[str] = mapped_column(String, default="database")
    byte_count: Mapped[int] = mapped_column(Integer, default=0)
    checksum_sha1: Mapped[str | None] = mapped_column(String, nullable=True)
    file_blob: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    report: Mapped["Report"] = relationship(back_populates="artifacts")

    @property
    def download_url(self) -> str:
        return f"/api/artifacts/{self.id}/download"


class RunLog(Base):
    __tablename__ = "run_logs"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    campaign_run_id: Mapped[str] = mapped_column(ForeignKey("campaign_runs.id"), nullable=False)
    source_key: Mapped[str | None] = mapped_column(String, nullable=True)
    level: Mapped[str] = mapped_column(String, default="info")
    message: Mapped[str] = mapped_column(Text, nullable=False)
    details_json: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class QueueJob(Base):
    __tablename__ = "queue_jobs"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    job_type: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, default="queued")
    payload_json: Mapped[dict] = mapped_column(JSON, default=dict)
    run_id: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    max_attempts: Mapped[int] = mapped_column(Integer, default=2)
    available_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    locked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class WorkerHeartbeat(Base):
    __tablename__ = "worker_heartbeats"

    worker_name: Mapped[str] = mapped_column(String, primary_key=True)
    worker_mode: Mapped[str] = mapped_column(String, nullable=False)
    process_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    host_name: Mapped[str | None] = mapped_column(String, nullable=True)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    details_json: Mapped[dict] = mapped_column(JSON, default=dict)
