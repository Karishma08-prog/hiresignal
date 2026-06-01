"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQueries } from "@tanstack/react-query";
import { ArrowLeft, Building2, ClipboardList, Clock3, FileStack, ListChecks } from "lucide-react";
import {
  getCampaignRun,
  getRunCompanies,
  getRunJobs,
  getRunLogs,
  getRunQueue,
} from "@/lib/api/campaigns";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { MetricCard } from "@/components/shared/metric-card";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { deriveRunMode } from "@/lib/run-mode";

export default function CampaignRunDetailPage() {
  const params = useParams<{ runId: string }>();
  const runId = String(params.runId);

  const [runQuery, companiesQuery, jobsQuery, logsQuery, queueQuery] = useQueries({
    queries: [
      {
        queryKey: ["campaign-run", runId],
        queryFn: () => getCampaignRun(runId),
        refetchInterval: 4_000,
      },
      {
        queryKey: ["run-companies", runId],
        queryFn: () => getRunCompanies(runId),
      },
      {
        queryKey: ["run-jobs", runId],
        queryFn: () => getRunJobs(runId),
      },
      {
        queryKey: ["run-logs", runId],
        queryFn: () => getRunLogs(runId),
        refetchInterval: 4_000,
      },
      {
        queryKey: ["run-queue", runId],
        queryFn: () => getRunQueue(runId),
        retry: false,
        refetchInterval: 4_000,
      },
    ],
  });

  if (runQuery.isLoading || companiesQuery.isLoading || jobsQuery.isLoading || logsQuery.isLoading) {
    return <LoadingState label="Loading campaign run detail..." />;
  }

  if (runQuery.isError || !runQuery.data) {
    return (
      <EmptyState
        title="Run detail could not be loaded"
        description="Check that the backend is running and that this run still exists."
      />
    );
  }

  const run = runQuery.data;
  const queue = queueQuery.data;
  const companies = companiesQuery.data ?? [];
  const jobs = jobsQuery.data ?? [];
  const logs = logsQuery.data ?? [];
  const resolvedRunMode = deriveRunMode(run, logs);

  const sourceRows = run.sourceSummary.map((source) => ({
    id: source.siteKey,
    source: source.siteKey,
    status: source.status,
    jobsFound: source.jobsFound,
    duration: source.durationMs ? `${Math.round(source.durationMs / 1000)}s` : "n/a",
    error: source.error ?? "None",
  }));

  const companyRows = companies.slice(0, 12).map((company) => ({
    id: company.id,
    company: company.name,
    fit: company.revEngineerFit,
    objective: company.objectiveSignal ?? "No signal",
    title: company.titleMatch ?? "No title match",
  }));

  const jobRows = jobs.slice(0, 12).map((job) => ({
    id: job.id,
    title: job.title,
    company: job.companyName,
    source: job.site,
    location: job.location ?? "Unknown",
    posted: job.datePosted ?? "Unknown",
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaign Run Detail"
        description="This page breaks a single run into queue state, source-level outcomes, logs, matched companies, imported jobs, and whether the data is fresh live or historical."
        action={
          <Link
            href="/campaigns"
            className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-black transition hover:border-black"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Campaigns
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Run status"
          value={run.status}
          change={`${resolvedRunMode} | triggered by ${run.triggeredBy}`}
          icon={Clock3}
        />
        <MetricCard
          label="Matched jobs"
          value={String(run.matchedJobCount)}
          change={`${run.rawJobCount} raw imported rows`}
          icon={FileStack}
        />
        <MetricCard
          label="Companies"
          value={String(run.companyCount)}
          change={`${run.errorCount} source errors`}
          icon={Building2}
        />
        <MetricCard
          label="Queue attempts"
          value={String(queue?.attempts ?? 0)}
          change={queue ? `${queue.status} queue state` : "No queue job record"}
          icon={ListChecks}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-5">
          <article className="rounded-[1.8rem] border border-blue-100 bg-white p-6 shadow-[0_12px_28px_rgba(15,15,15,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-black/60">
              Queue State
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-black">
              Worker lifecycle
            </h2>
            <div className="mt-4 space-y-3 text-sm text-black/70">
              <div className="flex items-center justify-between gap-3 rounded-[1.1rem] border border-blue-100 bg-blue-50 p-3">
                <span className="font-medium text-black">Run status</span>
                <StatusBadge status={run.status} />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-[1.1rem] border border-blue-100 bg-blue-50 p-3">
                <span className="font-medium text-black">Data provenance</span>
                <StatusBadge status={resolvedRunMode} />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-[1.1rem] border border-blue-100 bg-blue-50 p-3">
                <span className="font-medium text-black">Queue job</span>
                <StatusBadge status={queue?.status ?? "unknown"} />
              </div>
              <div className="rounded-[1.1rem] border border-blue-100 bg-blue-50 p-3">
                <p className="font-medium text-black">Run notes</p>
                <p className="mt-2 leading-7">{run.runNotes ?? "No run notes recorded yet."}</p>
              </div>
              {queue?.lastError ? (
                <div className="rounded-[1.1rem] border border-black bg-white p-3 text-black">
                  <p className="font-medium">Queue error</p>
                  <p className="mt-2 leading-7">{queue.lastError}</p>
                </div>
              ) : null}
            </div>
          </article>

          <article className="rounded-[1.8rem] border border-blue-100 bg-white p-6 shadow-[0_12px_28px_rgba(15,15,15,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-black/60">
              Source Summary
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-black">
              Engine outcomes
            </h2>
            <div className="mt-5">
              <DataTable
                columns={[
                  { key: "source", header: "Source" },
                  {
                    key: "status",
                    header: "Status",
                    render: (row) => <StatusBadge status={String(row.status)} />,
                  },
                  { key: "jobsFound", header: "Jobs" },
                  { key: "duration", header: "Duration" },
                  { key: "error", header: "Error" },
                ]}
                rows={sourceRows}
                emptyMessage="No source-level results have been recorded for this run yet."
              />
            </div>
          </article>
        </div>

        <div className="space-y-5">
          <article className="rounded-[1.8rem] border border-blue-100 bg-white p-6 shadow-[0_12px_28px_rgba(15,15,15,0.05)]">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-2xl bg-blue-50 p-3 text-black/80">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-black/60">
                  Logs
                </p>
                <h2 className="text-2xl font-semibold tracking-tight text-black">
                  Recent worker messages
                </h2>
              </div>
            </div>
            <div className="space-y-3">
              {logs.slice(0, 12).map((log) => (
                <div
                  key={log.id}
                  className="rounded-[1.1rem] border border-blue-100 bg-blue-50 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <StatusBadge status={log.level} />
                    <span className="text-xs text-black/60">
                      {log.createdAt.slice(0, 19).replace("T", " ")}
                    </span>
                  </div>
                  <p className="mt-2 font-medium text-black">{log.message}</p>
                  {log.sourceKey ? (
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-black/60">
                      {log.sourceKey}
                    </p>
                  ) : null}
                </div>
              ))}
              {!logs.length ? (
                <p className="text-sm text-black/60">
                  No worker log messages have been recorded for this run yet.
                </p>
              ) : null}
            </div>
          </article>

          <article className="rounded-[1.8rem] border border-blue-100 bg-white p-6 shadow-[0_12px_28px_rgba(15,15,15,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-black/60">
              Matched Companies
            </p>
            <div className="mt-5">
              <DataTable
                columns={[
                  { key: "company", header: "Company" },
                  { key: "fit", header: "Fit" },
                  { key: "objective", header: "Objective" },
                  { key: "title", header: "Title Match" },
                ]}
                rows={companyRows}
                emptyMessage="No companies have been matched for this run yet."
              />
            </div>
          </article>

          <article className="rounded-[1.8rem] border border-blue-100 bg-white p-6 shadow-[0_12px_28px_rgba(15,15,15,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-black/60">
              Imported Jobs
            </p>
            <div className="mt-5">
              <DataTable
                columns={[
                  { key: "title", header: "Title" },
                  { key: "company", header: "Company" },
                  { key: "source", header: "Source" },
                  { key: "location", header: "Location" },
                  { key: "posted", header: "Posted" },
                ]}
                rows={jobRows}
                emptyMessage="No jobs have been imported for this run yet."
              />
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
