"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Building2,
  Clock3,
  CirclePlus,
  FileBarChart2,
  Radar,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { getAllCampaignRuns, getAllCampaigns } from "@/lib/api/campaigns";
import { getCompaniesPage } from "@/lib/api/companies";
import { getAllReports } from "@/lib/api/reports";
import { getSourceOverview } from "@/lib/api/sources";
import { deriveRunMode, isActiveRunStatus } from "@/lib/run-mode";
import { CreateCampaignDialog } from "@/components/campaigns/create-campaign-dialog";
import { ClientErrorBoundary } from "@/components/shared/client-error-boundary";
import { HistoryBarChart } from "@/components/shared/history-bar-chart";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { MetricCard } from "@/components/shared/metric-card";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";

export default function DashboardPage() {
  const campaignsQuery = useQuery({
    queryKey: ["campaigns"],
    queryFn: getAllCampaigns,
  });
  const companiesQuery = useQuery({
    queryKey: ["companies", "dashboard"],
    queryFn: () => getCompaniesPage({ pageSize: 8 }),
  });
  const reportsQuery = useQuery({
    queryKey: ["reports"],
    queryFn: getAllReports,
  });
  const runsQuery = useQuery({
    queryKey: ["campaign-runs"],
    queryFn: () => getAllCampaignRuns(),
    refetchInterval: (query) => {
      const items = query.state.data ?? [];
      return items.some((run) => isActiveRunStatus(run.status)) ? 4_000 : false;
    },
  });
  const sourcesQuery = useQuery({
    queryKey: ["source-overview"],
    queryFn: getSourceOverview,
    refetchInterval: (query) => {
      const items = query.state.data ?? [];
      return items.some((source) => source.status === "running") ? 4_000 : false;
    },
  });

  const runMap = useMemo(() => {
    const entries = (runsQuery.data ?? []).map((run) => [run.id, run] as const);
    return new Map(entries);
  }, [runsQuery.data]);

  const dashboardReady =
    Boolean(campaignsQuery.data) ||
    Boolean(companiesQuery.data) ||
    Boolean(reportsQuery.data) ||
    Boolean(runsQuery.data) ||
    Boolean(sourcesQuery.data);

  if (
    !dashboardReady &&
    (campaignsQuery.isError ||
      companiesQuery.isError ||
      reportsQuery.isError ||
      runsQuery.isError ||
      sourcesQuery.isError)
  ) {
    return (
      <EmptyState
        title="Dashboard data could not be loaded"
        description="The dashboard now reads live campaigns, companies, reports, and source health from the backend. Start the backend on port 8000 and import at least one run."
      />
    );
  }

  const campaigns = campaignsQuery.data ?? [];
  const companies = companiesQuery.data?.items ?? [];
  const totalCompanies = companiesQuery.data?.total ?? companies.length;
  const reports = reportsQuery.data ?? [];
  const runs = runsQuery.data ?? [];
  const campaignRows = campaigns.slice(0, 6).map((campaign) => {
    const run = campaign.lastRunId ? runMap.get(campaign.lastRunId) : undefined;
    return {
      id: campaign.id,
      campaign: campaign.name,
      status: campaign.status,
      jobsFound: run?.matchedJobCount ?? 0,
      companies: run?.companyCount ?? 0,
    };
  });

  const companyRows = companies.slice(0, 6).map((company) => ({
    id: company.id,
    company: company.name,
    fit: company.revEngineerFit,
    title: company.titleMatch ?? "Not tagged yet",
    location: company.location ?? "Unknown",
  }));

  const runRows = runs.slice(0, 8).map((run) => {
    const campaign = campaigns.find((item) => item.id === run.campaignId);
    const resolvedRunMode = deriveRunMode(run);
    return {
      id: run.id,
      run: run.id,
      campaign: campaign?.name ?? run.campaignId,
      queueState: run.status,
      runMode: resolvedRunMode,
      jobs: run.matchedJobCount,
      companies: run.companyCount,
    };
  });

  const historyPoints = runs.slice(0, 7).reverse().map((run) => {
    const campaign = campaigns.find((item) => item.id === run.campaignId);
    return {
      label: campaign?.name ?? run.id,
      value: run.matchedJobCount,
      secondaryValue: run.companyCount,
      href: `/campaign-runs/${run.id}`,
    };
  });

  const freshLiveRuns = runs.filter((run) => deriveRunMode(run) === "fresh_live").length;
  const historicalRuns = runs.filter((run) => deriveRunMode(run) === "historical_import").length;
  const workspaceLinks = [
    { href: "/scraper", label: "Open Scraper" },
    { href: "/campaigns", label: "View Campaigns" },
    { href: "/companies", label: "View Companies" },
    { href: "/job-boards", label: "View Job Boards" },
    { href: "/reports", label: "View Reports" },
    { href: "/settings", label: "View Settings" },
  ];
  const widgetFallback = (
    <EmptyState
      title="This dashboard section could not render"
      description="The rest of the workspace is still available. Open Scraper, Campaigns, Companies, Reports, or Settings directly from this page."
    />
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="HireSignal turns hiring activity into lead signals. Create a campaign, pull live job board evidence, and review which companies are showing expansion intent."
        action={(
          <ClientErrorBoundary fallback={null}>
            <CreateCampaignDialog />
          </ClientErrorBoundary>
        )}
      />

      {!dashboardReady ? <LoadingState label="Opening the live lead engine..." /> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Active campaigns"
          value={String(campaigns.length)}
          change="Live backend campaign records"
          icon={Radar}
        />
        <MetricCard
          label="Tracked companies"
          value={String(totalCompanies)}
          change="Imported from real run outputs"
          icon={Building2}
        />
        <MetricCard
          label="Run provenance"
          value={String(freshLiveRuns)}
          change={`${historicalRuns} historical imports | ${reports.length} reports ready`}
          icon={FileBarChart2}
        />
      </section>

      <section className="rounded-[1.8rem] border border-blue-100 bg-white p-6 shadow-[0_12px_28px_rgba(15,15,15,0.05)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--brand-blue)]">
              Lead Engine
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-black">
              Find companies by hire signal, not by guesswork
            </h2>
            <p className="mt-3 text-sm leading-7 text-[rgba(15,15,15,0.72)]">
              HireSignal watches open roles across job boards, scores company-specific hiring
              signals, and helps you turn recruiting activity into a clean outbound lead list.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.2rem] border border-[rgba(37,99,235,0.2)] bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--brand-blue)]">
                1. Track
              </p>
              <p className="mt-2 text-sm font-medium text-black">
                Watch role, market, and location hiring activity.
              </p>
            </div>
            <div className="rounded-[1.2rem] border border-[rgba(37,99,235,0.2)] bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--brand-blue)]">
                2. Score
              </p>
              <p className="mt-2 text-sm font-medium text-black">
                Turn title and objective filters into signal-based leads.
              </p>
            </div>
            <div className="rounded-[1.2rem] border border-[rgba(37,99,235,0.2)] bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--brand-blue)]">
                3. Export
              </p>
              <p className="mt-2 text-sm font-medium text-black">
                Review company evidence and download reports for outreach.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[1.8rem] border border-blue-100 bg-white p-6 shadow-[0_12px_28px_rgba(15,15,15,0.05)]">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--brand-blue)]">
          Workspace Links
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-black">
          Open every section directly
        </h2>
        <p className="mt-3 text-sm leading-7 text-[rgba(15,15,15,0.72)]">
          Use these direct links if you want to jump straight into campaigns, companies, job boards,
          reports, or settings without relying on the sidebar.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          {workspaceLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex items-center rounded-full border border-[rgba(37,99,235,0.2)] bg-white px-4 py-2 text-sm font-semibold text-black transition hover:border-[var(--brand-blue)]"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-5">
          <ClientErrorBoundary fallback={widgetFallback}>
            <div className="rounded-[1.8rem] border border-blue-100 bg-white p-6 shadow-[0_12px_28px_rgba(15,15,15,0.05)]">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-2xl bg-[rgba(37,99,235,0.12)] p-3 text-[var(--brand-blue)]">
                  <Radar className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--brand-blue)]">
                    Campaign Overview
                  </p>
                  <h2 className="text-2xl font-semibold tracking-tight text-black">
                    Recent scraper runs
                  </h2>
                </div>
              </div>
              {campaignsQuery.isLoading && campaignRows.length === 0 ? (
                <LoadingState label="Loading recent campaigns..." />
              ) : (
                <DataTable
                  columns={[
                    { key: "campaign", header: "Campaign" },
                    {
                      key: "status",
                      header: "Status",
                      render: (row) => <StatusBadge status={String(row.status)} />,
                    },
                    { key: "jobsFound", header: "Jobs" },
                    { key: "companies", header: "Companies" },
                  ]}
                  rows={campaignRows}
                  emptyMessage="No campaigns have been created yet."
                />
              )}
            </div>
          </ClientErrorBoundary>

          <ClientErrorBoundary fallback={widgetFallback}>
            {historyPoints.length ? (
              <HistoryBarChart
                title="Run History"
                subtitle="Latest run throughput"
                points={historyPoints}
              />
            ) : (
              <LoadingState label="Preparing throughput history..." />
            )}
          </ClientErrorBoundary>

          <ClientErrorBoundary fallback={widgetFallback}>
            <div className="rounded-[1.8rem] border border-blue-100 bg-white p-6 shadow-[0_12px_28px_rgba(15,15,15,0.05)]">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-2xl bg-[rgba(37,99,235,0.12)] p-3 text-[var(--brand-blue)]">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--brand-blue)]">
                    Company Snapshot
                  </p>
                  <h2 className="text-2xl font-semibold tracking-tight text-black">
                    Latest target companies
                  </h2>
                </div>
              </div>
              {companiesQuery.isLoading && companyRows.length === 0 ? (
                <LoadingState label="Loading company signals..." />
              ) : (
                <DataTable
                  columns={[
                    { key: "company", header: "Company" },
                    { key: "fit", header: "Fit" },
                    { key: "title", header: "Title Match" },
                    { key: "location", header: "Location" },
                  ]}
                  rows={companyRows}
                  emptyMessage="No companies have been imported yet."
                />
              )}
            </div>
          </ClientErrorBoundary>
        </div>

        <div className="space-y-5">
          <ClientErrorBoundary fallback={widgetFallback}>
            <article className="rounded-[1.8rem] border border-blue-100 bg-white p-6 shadow-[0_12px_28px_rgba(15,15,15,0.05)]">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[rgba(37,99,235,0.12)] p-3 text-[var(--brand-blue)]">
                  <Workflow className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--brand-blue)]">
                    Workflow
                  </p>
                  <h2 className="text-2xl font-semibold tracking-tight text-black">
                    Live pipeline health
                  </h2>
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-[rgba(15,15,15,0.72)]">
                Scraper creates campaigns, runs import real results, companies are aggregated from
                matched jobs, and source health now feeds both the Job Boards page and this overview.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  href="/scraper"
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--brand-blue)] bg-[var(--brand-blue)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                >
                  <CirclePlus className="h-4 w-4" />
                  Open Scraper
                </Link>
                <Link
                  href="/scraper#create-campaign"
                  className="inline-flex items-center gap-2 rounded-full border border-black bg-white px-4 py-2 text-sm font-semibold text-black transition hover:border-[var(--brand-blue)]"
                >
                  Open campaign form
                </Link>
                <Link
                  href="/job-boards"
                  className="inline-flex items-center gap-2 rounded-full border border-black bg-white px-4 py-2 text-sm font-semibold text-black transition hover:border-[var(--brand-blue)]"
                >
                  Review source health
                </Link>
              </div>
            </article>
          </ClientErrorBoundary>

          <ClientErrorBoundary fallback={widgetFallback}>
            <article className="rounded-[1.8rem] border border-blue-100 bg-white p-6 shadow-[0_12px_28px_rgba(15,15,15,0.05)]">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-2xl bg-[rgba(37,99,235,0.12)] p-3 text-[var(--brand-blue)]">
                  <Clock3 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--brand-blue)]">
                    Queue + History
                  </p>
                  <h2 className="text-2xl font-semibold tracking-tight text-black">
                    Recent runs
                  </h2>
                </div>
              </div>
              <DataTable
                columns={[
                  {
                    key: "run",
                    header: "Run",
                    render: (row) => (
                      <Link
                        href={`/campaign-runs/${row.id}`}
                        className="font-semibold text-[var(--brand-blue)] hover:underline"
                      >
                        {String(row.run).slice(0, 12)}
                      </Link>
                    ),
                  },
                  { key: "campaign", header: "Campaign" },
                  {
                    key: "queueState",
                    header: "Status",
                    render: (row) => <StatusBadge status={String(row.queueState)} />,
                  },
                  {
                    key: "runMode",
                    header: "Data Mode",
                    render: (row) => <StatusBadge status={String(row.runMode)} />,
                  },
                  { key: "jobs", header: "Jobs" },
                  { key: "companies", header: "Companies" },
                ]}
                rows={runRows}
                emptyMessage="No campaign runs have been recorded yet."
              />
            </article>
          </ClientErrorBoundary>

        </div>
      </section>
    </div>
  );
}

