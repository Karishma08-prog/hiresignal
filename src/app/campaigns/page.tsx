"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Globe2, Search, Tags } from "lucide-react";
import Link from "next/link";
import { getCampaignRuns, getCampaigns } from "@/lib/api/campaigns";
import {
  getCampaignBoards,
  normalizeCampaignObjectiveFilterConfig,
  normalizeCampaignSourceConfig,
  normalizeCampaignTitleFilterConfig,
} from "@/lib/campaign-normalize";
import { deriveRunMode, isActiveRunStatus } from "@/lib/run-mode";
import { CreateCampaignDialog } from "@/components/campaigns/create-campaign-dialog";
import { ClientErrorBoundary } from "@/components/shared/client-error-boundary";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { MetricCard } from "@/components/shared/metric-card";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";

export default function CampaignsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const deferredSearch = useDeferredValue(search);
  const pageSize = 6;
  const campaignsQuery = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => getCampaigns(100),
  });

  const runsQuery = useQuery({
    queryKey: ["campaign-runs"],
    queryFn: () => getCampaignRuns(undefined, 100),
    refetchInterval: (query) => {
      const items = query.state.data ?? [];
      return items.some((run) => isActiveRunStatus(run.status)) ? 4_000 : false;
    },
  });

  const runMap = useMemo(() => {
    const entries = (runsQuery.data ?? []).map((run) => [run.id, run] as const);
    return new Map(entries);
  }, [runsQuery.data]);

  const campaigns = campaignsQuery.data ?? [];
  const campaignRows = campaigns.map((campaign) => {
    const run = campaign.lastRunId ? runMap.get(campaign.lastRunId) : undefined;
    const resolvedRunMode = run ? deriveRunMode(run) : "unknown";
    const sourceConfig = normalizeCampaignSourceConfig(campaign);
    const titleFilterConfig = normalizeCampaignTitleFilterConfig(campaign);
    const objectiveFilterConfig = normalizeCampaignObjectiveFilterConfig(campaign);
    const boards = getCampaignBoards(campaign);
    return {
      id: campaign.id,
      lastRunId: campaign.lastRunId ?? null,
      name: campaign.name,
      status: campaign.status,
      runMode: resolvedRunMode,
      role: campaign.roleQuery,
      days: `${campaign.days} days`,
      jobsFound: run?.matchedJobCount ?? 0,
      companiesFound: run?.companyCount ?? 0,
      runNotes: run?.runNotes ?? "No run has been triggered yet.",
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
      objective: objectiveFilterConfig.objective ?? "No objective configured yet.",
      location: campaign.location,
      sourceCount:
        sourceConfig.searchBoards.length +
        sourceConfig.browserBoards.length +
        sourceConfig.atsBoards.length,
      boards,
      titles: titleFilterConfig.includeTitles,
    };
  });

  const filteredCampaignRows = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();
    return campaignRows
      .filter((campaign) => {
        const matchesSearch =
          !term ||
          [
            campaign.name,
            campaign.role,
            campaign.objective,
            campaign.location,
            campaign.boards.join(", "),
          ]
            .some((value) => String(value).toLowerCase().includes(term));
        const matchesStatus = statusFilter === "all" || campaign.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((left, right) => {
        if (sortBy === "jobs") {
          return right.jobsFound - left.jobsFound;
        }
        if (sortBy === "companies") {
          return right.companiesFound - left.companiesFound;
        }
        if (sortBy === "name") {
          return left.name.localeCompare(right.name);
        }
        return right.updatedAt.localeCompare(left.updatedAt);
      });
  }, [campaignRows, deferredSearch, statusFilter, sortBy]);

  const totalPages = Math.ceil(filteredCampaignRows.length / pageSize);
  const currentPage = Math.min(page, Math.max(totalPages, 1));
  const paginatedCampaignRows = filteredCampaignRows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const boardCount = new Set(
    campaigns.flatMap((campaign) => getCampaignBoards(campaign)),
  ).size;

  const titleFilterCount = campaigns.reduce(
    (total, campaign) => total + normalizeCampaignTitleFilterConfig(campaign).includeTitles.length,
    0,
  );
  const widgetFallback = (
    <EmptyState
      title="This campaigns section could not render"
      description="The rest of the workspace is still available. You can still open Scraper, Reports, Companies, and Settings while we isolate the failing widget."
    />
  );

  if (campaignsQuery.isError) {
    return (
      <EmptyState
        title="Campaigns could not be loaded"
        description="The frontend is now reading campaigns from the backend API. Check that the backend is running on port 8000 and that campaign runs have been created."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaigns"
        description="Campaigns define the lead-hunting logic: which roles to watch, which boards to scan, and which hiring signals should qualify a company."
        action={(
          <ClientErrorBoundary fallback={null}>
            <CreateCampaignDialog />
          </ClientErrorBoundary>
        )}
      />

      {campaignsQuery.isLoading && campaigns.length === 0 ? (
        <LoadingState label="Loading lead campaigns from the backend..." />
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Campaign runs"
          value={String(campaigns.length)}
          change="Live backend campaigns"
          icon={Activity}
        />
        <MetricCard
          label="Boards in rotation"
          value={String(boardCount)}
          change="Across search, browser, and ATS engines"
          icon={Globe2}
        />
        <MetricCard
          label="Tracked role filters"
          value={String(titleFilterCount)}
          change="Saved in campaign filter config"
          icon={Tags}
        />
      </section>

      <section className="rounded-[1.8rem] border border-blue-100 bg-white p-5 shadow-[0_12px_28px_rgba(15,15,15,0.05)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-black/60">
              Campaign Controls
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-black">
              Search, filter, and rank active lead campaigns
            </h2>
          </div>
          <div className="grid w-full gap-3 lg:max-w-4xl lg:grid-cols-4">
            <label className="flex items-center gap-3 rounded-full border border-blue-100 bg-blue-50 px-4 py-3 lg:col-span-2">
              <Search className="h-4 w-4 text-black/45" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search campaigns..."
                className="w-full bg-transparent text-sm text-black outline-none placeholder:text-black/45"
              />
            </label>
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
              className="rounded-full border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-black outline-none"
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
            <select
              value={sortBy}
              onChange={(event) => {
                setSortBy(event.target.value);
                setPage(1);
              }}
              className="rounded-full border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-black outline-none"
            >
              <option value="newest">Sort: Newest</option>
              <option value="jobs">Sort: Most jobs</option>
              <option value="companies">Sort: Most companies</option>
              <option value="name">Sort: Name A-Z</option>
            </select>
          </div>
        </div>
      </section>

      {campaigns.length === 0 && !campaignsQuery.isLoading ? (
        <EmptyState
          title="No campaigns yet"
          description="Create a campaign from the Scraper page and trigger a run to populate this view."
        />
      ) : (
        <section className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
          <ClientErrorBoundary fallback={widgetFallback}>
            <div className="space-y-4">
              {paginatedCampaignRows.map((campaign) => {
                return (
                  <article
                    key={campaign.id}
                    className="rounded-[1.8rem] border border-blue-100 bg-white p-6 shadow-[0_12px_28px_rgba(15,15,15,0.05)]"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <StatusBadge status={campaign.status} />
                          <StatusBadge status={campaign.runMode} />
                          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-black/60">
                            {campaign.createdAt.slice(0, 10)}
                          </span>
                        </div>
                        <h2 className="text-2xl font-semibold tracking-tight text-black">
                          {campaign.name}
                        </h2>
                        <p className="max-w-2xl text-sm leading-7 text-black/70">
                          {campaign.objective}
                        </p>
                      </div>
                      <div className="rounded-[1.4rem] border border-blue-100 bg-blue-50 px-4 py-3 text-right">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-black/60">
                          Jobs Found
                        </p>
                        <p className="mt-2 text-3xl font-semibold text-black">
                          {campaign.jobsFound}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-3">
                      <div className="rounded-[1.3rem] border border-blue-100 bg-blue-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-black/60">
                          Search Role
                        </p>
                        <p className="mt-2 text-sm font-medium text-black">
                          {campaign.role}
                        </p>
                        <p className="mt-1 text-sm text-black/60">
                          {campaign.location} | {campaign.days}
                        </p>
                      </div>
                      <div className="rounded-[1.3rem] border border-blue-100 bg-blue-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-black/60">
                          Role Filters
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {campaign.titles.length ? (
                            campaign.titles.map((title) => (
                              <span
                                key={title}
                                className="rounded-full border border-blue-100 bg-white px-3 py-1 text-xs font-medium text-black/80"
                              >
                                {title}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-black/60">
                              No role filters configured yet
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="rounded-[1.3rem] border border-blue-100 bg-blue-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-black/60">
                          Sources
                        </p>
                        <p className="mt-2 text-sm font-medium text-black">
                          {campaign.sourceCount} connected boards
                        </p>
                        <p className="mt-1 text-sm leading-6 text-black/60">
                          {campaign.boards.join(", ") || "No boards selected yet"}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
              <PaginationControls
                page={currentPage}
                totalPages={totalPages}
                totalItems={filteredCampaignRows.length}
                pageSize={pageSize}
                itemLabel="campaigns"
                onPrevious={() => setPage((current) => Math.max(1, current - 1))}
                onNext={() => setPage((current) => Math.min(totalPages, current + 1))}
              />
            </div>
          </ClientErrorBoundary>

          <ClientErrorBoundary fallback={widgetFallback}>
            <div className="space-y-4">
              <div className="rounded-[1.8rem] border border-blue-100 bg-white p-6 shadow-[0_12px_28px_rgba(15,15,15,0.05)]">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-black">
                  Campaign Matrix
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-black">
                  Lead-generation control plane
                </h2>
                <p className="mt-3 text-sm leading-7 text-black/70">
                  Each campaign is a reusable lead recipe. Choose the titles, geography, and job
                  boards that reveal which companies are hiring into your target motion.
                </p>
              </div>

              <DataTable
                columns={[
                  { key: "name", header: "Campaign" },
                  {
                    key: "status",
                    header: "Status",
                    render: (row) => <StatusBadge status={String(row.status)} />,
                  },
                  { key: "jobsFound", header: "Jobs" },
                  {
                    key: "runMode",
                    header: "Data Mode",
                    render: (row) => <StatusBadge status={String(row.runMode)} />,
                  },
                  {
                    key: "runLink",
                    header: "Run Detail",
                    render: (row) =>
                      row.lastRunId ? (
                        <Link
                          href={`/campaign-runs/${row.lastRunId}`}
                          className="font-semibold text-[var(--brand-blue)] hover:underline"
                        >
                          Open run
                        </Link>
                      ) : (
                        "No run yet"
                      ),
                  },
                  { key: "runNotes", header: "Run Notes" },
                ]}
                rows={paginatedCampaignRows.map((row) => ({ ...row, runLink: "" }))}
                emptyMessage="No campaigns match the current filters."
              />
            </div>
          </ClientErrorBoundary>
        </section>
      )}
    </div>
  );
}

