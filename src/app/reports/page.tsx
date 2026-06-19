"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, FileSearch, Filter, LineChart, Search } from "lucide-react";
import { downloadArtifactById, getReports } from "@/lib/api/reports";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { MetricCard } from "@/components/shared/metric-card";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";

export default function ReportsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [downloadFeedback, setDownloadFeedback] = useState("");
  const deferredSearch = useDeferredValue(search);
  const pageSize = 6;
  const reportsQuery = useQuery({
    queryKey: ["reports"],
    queryFn: () => getReports(40),
  });
  const downloadMutation = useMutation({
    mutationFn: async (artifactId: string) => downloadArtifactById(artifactId),
    onSuccess: (fileName) => {
      setDownloadFeedback(`Downloaded ${fileName}.`);
    },
    onError: () => {
      setDownloadFeedback("The report could not be downloaded. Check that the artifact still exists.");
    },
  });

  const reports = reportsQuery.data ?? [];
  const artifactCount = reports.reduce((total, report) => total + report.artifactIds.length, 0);

  const rows = reports.map((report) => {
    const preferredArtifactId = report.artifactIds[0] ?? null;

    return {
      id: report.id,
      name: report.name,
      focus: report.focus ?? "Report",
      metric: report.metric ?? "No metric",
      status: report.status,
      generatedAt: report.generatedAt?.slice(0, 10) ?? "Pending",
      artifactId: preferredArtifactId,
    };
  });

  const filteredRows = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();
    return rows
      .filter((report) => {
        const matchesSearch =
          !term ||
          [report.name, report.focus, report.metric].some((value) =>
            String(value).toLowerCase().includes(term),
          );
        const matchesStatus = statusFilter === "all" || report.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((left, right) => {
        if (sortBy === "name") {
          return left.name.localeCompare(right.name);
        }
        if (sortBy === "status") {
          return left.status.localeCompare(right.status);
        }
        return right.generatedAt.localeCompare(left.generatedAt);
      });
  }, [rows, deferredSearch, statusFilter, sortBy]);

  const totalPages = Math.ceil(filteredRows.length / pageSize);
  const currentPage = Math.min(page, Math.max(totalPages, 1));
  const paginatedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (reportsQuery.isError) {
    return (
      <EmptyState
        title="Reports could not be loaded"
        description="The reports page now depends on the backend report and artifact endpoints. Start the backend and run a campaign import."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Reports package the strongest hiring signals into exportable lead assets, so the team can move from discovery to outreach without rebuilding the list."
      />

      {reportsQuery.isLoading && reports.length === 0 ? (
        <LoadingState label="Loading reports from the backend..." />
      ) : null}

      {downloadFeedback ? (
        <div className="rounded-[1.25rem] border border-blue-100 bg-white px-4 py-3 text-sm text-black/80 shadow-[0_12px_24px_rgba(15,15,15,0.04)]">
          {downloadFeedback}
        </div>
      ) : null}

      <section className="rounded-[1.8rem] border border-blue-100 bg-white p-5 shadow-[0_12px_28px_rgba(15,15,15,0.05)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-black/60">
              Report Controls
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-black">
              Search, filter, and sort exports
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
                placeholder="Search reports..."
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
              <option value="ready">Ready</option>
              <option value="queued">Queued</option>
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
              <option value="name">Sort: Name A-Z</option>
              <option value="status">Sort: Status</option>
            </select>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Reports ready"
          value={String(reports.filter((report) => report.status === "ready").length)}
          change="Generated by backend imports"
          icon={LineChart}
        />
        <MetricCard
          label="Shortlists in review"
          value={String(reports.filter((report) => report.type === "company_shortlist").length)}
          change="Company targeting focus"
          icon={FileSearch}
        />
        <MetricCard
          label="Exportable artifacts"
          value={String(artifactCount)}
          change="CSV and workbook outputs attached"
          icon={Filter}
        />
      </section>

      {filteredRows.length === 0 && !reportsQuery.isLoading ? (
        <EmptyState
          title={reports.length === 0 ? "No reports yet" : "No reports match this view"}
          description={
            reports.length === 0
              ? "Run a campaign first so the backend can generate summary reports and attach export artifacts."
              : "Try a different search or status filter."
          }
        />
      ) : (
        <>
          <section className="grid gap-5 xl:grid-cols-3">
            {paginatedRows.map((report) => (
              <article
                key={report.id}
                className="rounded-[1.8rem] border border-blue-100 bg-white p-6 shadow-[0_12px_28px_rgba(15,15,15,0.05)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <StatusBadge status={report.status} />
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-black/60">
                    {report.generatedAt}
                  </span>
                </div>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight text-black">
                  {report.name}
                </h2>
                <p className="mt-2 text-sm font-medium text-[var(--brand-blue)]">
                  {report.metric}
                </p>
                <p className="mt-3 text-sm leading-7 text-black/70">
                  {reports.find((item) => item.id === report.id)?.summary ?? "No summary yet."}
                </p>
                <div className="mt-5 rounded-[1.3rem] border border-blue-100 bg-blue-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-black/60">
                    Focus
                  </p>
                  <p className="mt-2 text-sm font-medium text-black">
                    {report.focus}
                  </p>
                </div>
                {report.artifactId ? (
                  <button
                    type="button"
                    onClick={() => {
                      setDownloadFeedback("");
                      downloadMutation.mutate(String(report.artifactId));
                    }}
                    disabled={downloadMutation.isPending}
                    className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--brand-blue)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    <Download className="h-4 w-4" />
                    {downloadMutation.isPending ? "Downloading..." : "Download"}
                  </button>
                ) : (
                  <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-blue-100 px-4 py-2 text-sm font-semibold text-black/45">
                    <Download className="h-4 w-4" />
                    No artifact
                  </span>
                )}
              </article>
            ))}
          </section>

          <DataTable
            columns={[
              { key: "name", header: "Report" },
              { key: "focus", header: "Focus" },
              { key: "metric", header: "Metric" },
              {
                key: "status",
                header: "Status",
                render: (row) => <StatusBadge status={String(row.status)} />,
              },
              { key: "generatedAt", header: "Generated" },
              {
                key: "artifactId",
                header: "Export",
                render: (row) => (
                  row.artifactId ? (
                    <button
                      type="button"
                      onClick={() => {
                        setDownloadFeedback("");
                        downloadMutation.mutate(String(row.artifactId));
                      }}
                      disabled={downloadMutation.isPending}
                      className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-2 text-xs font-semibold text-[var(--brand-blue)] transition hover:border-[var(--brand-blue)]"
                    >
                      <Download className="h-3.5 w-3.5" />
                      {downloadMutation.isPending ? "Downloading..." : "Export"}
                    </button>
                  ) : (
                    <span className="text-xs text-black/45">Unavailable</span>
                  )
                ),
              },
            ]}
            rows={paginatedRows}
            emptyMessage="No reports match the current search and filters."
          />
          <PaginationControls
            page={currentPage}
            totalPages={totalPages}
            totalItems={filteredRows.length}
            pageSize={pageSize}
            itemLabel="reports"
            onPrevious={() => setPage((current) => Math.max(1, current - 1))}
            onNext={() => setPage((current) => Math.min(totalPages, current + 1))}
          />
        </>
      )}
    </div>
  );
}

