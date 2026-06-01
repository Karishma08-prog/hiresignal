"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, ShieldCheck, Waypoints } from "lucide-react";
import { getSourceOverview, retestAllSources } from "@/lib/api/sources";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { MetricCard } from "@/components/shared/metric-card";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import type { SourceOverview } from "@/lib/types/source";

const VISIBLE_SUPPORT_TIERS = new Set([
  "live_supported",
  "fallback_supported",
]);

function getCoverageStatus(source: SourceOverview) {
  if (source.status === "running") {
    return "running";
  }

  return source.supportTier || "experimental";
}

export default function JobBoardsPage() {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState("");

  const sourcesQuery = useQuery({
    queryKey: ["source-overview"],
    queryFn: getSourceOverview,
    refetchInterval: (query) => {
      const items = (query.state.data as SourceOverview[] | undefined) ?? [];
      return items.some((source) => source.status === "running") ? 2_000 : false;
    },
  });

  const retestAllMutation = useMutation({
    mutationFn: retestAllSources,
    onSuccess: (result) => {
      setFeedback(result.message);
      window.setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ["source-overview"] });
      }, 2_500);
    },
    onError: () => {
      setFeedback("The backend could not queue the retest for all sources.");
    },
  });

  const visibleSources = useMemo(
    () =>
      (sourcesQuery.data ?? [])
        .filter(
          (source) =>
            source.clientVisible &&
            (
              source.status === "running" ||
              (source.status === "ready" && VISIBLE_SUPPORT_TIERS.has(source.supportTier))
            ),
        )
        .sort((left, right) => {
          const leftStatus = getCoverageStatus(left);
          const rightStatus = getCoverageStatus(right);
          const statusPriority = ["running", "live_supported", "fallback_supported"];
          const leftPriority = statusPriority.indexOf(leftStatus);
          const rightPriority = statusPriority.indexOf(rightStatus);
          if (leftPriority !== rightPriority) {
            return leftPriority - rightPriority;
          }
          return left.displayName.localeCompare(right.displayName);
        }),
    [sourcesQuery.data],
  );

  if (sourcesQuery.isLoading) {
    return <LoadingState label="Loading source health from the backend..." />;
  }

  if (sourcesQuery.isError) {
    return (
      <EmptyState
        title="Source health could not be loaded"
        description="The Job Boards page reads live source overview data from the backend. Start the backend and verify the `/api/sources/overview` endpoint."
      />
    );
  }

  const coverageRows = visibleSources.map((source) => ({
    id: source.siteKey,
    name: source.displayName,
    location: source.region,
    status: getCoverageStatus(source),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Job Boards"
        description="Live backend source coverage, grouped into the source families you can safely launch for real campaigns."
        action={(
          <button
            type="button"
            onClick={() => retestAllMutation.mutate()}
            disabled={retestAllMutation.isPending}
            className="rounded-full border border-blue-200 bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {retestAllMutation.isPending ? "Queueing retests..." : "Retest All Sources"}
          </button>
        )}
      />

      {feedback ? (
        <div className="rounded-[1.25rem] border border-blue-100 bg-white px-4 py-3 text-sm text-black/80 shadow-[0_12px_24px_rgba(15,15,15,0.04)]">
          {feedback}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Visible source groups"
          value={String(visibleSources.length)}
          change="Source families that are ready or running now"
          icon={Waypoints}
        />
        <MetricCard
          label="Live supported"
          value={String(visibleSources.filter((source) => source.supportTier === "live_supported").length)}
          change="Recent live retests succeeded from this backend"
          icon={ShieldCheck}
        />
        <MetricCard
          label="Fallback supported"
          value={String(visibleSources.filter((source) => source.supportTier === "fallback_supported").length)}
          change="Historically proven and safe for controlled fallback"
          icon={Activity}
        />
      </section>

      {coverageRows.length === 0 ? (
        <EmptyState
          title="No sources registered yet"
          description="Import a campaign run first so the backend can create source health and support rows."
        />
      ) : (
        <section className="rounded-[1.8rem] border border-blue-100 bg-white p-6 shadow-[0_12px_28px_rgba(15,15,15,0.05)]">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-black">
              Source Coverage
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-black">
              Source, location, and status
            </h2>
            <p className="mt-2 max-w-4xl text-sm leading-7 text-black/70">
              Each family is marked as live supported, fallback supported, or running based on real backend evidence and current backend readiness.
            </p>
          </div>

          <DataTable
            columns={[
              { key: "name", header: "Source" },
              { key: "location", header: "Location" },
              {
                key: "status",
                header: "Status",
                render: (row) => <StatusBadge status={String(row.status)} />,
              },
            ]}
            rows={coverageRows}
            emptyMessage="No supported source groups are available yet."
          />
        </section>
      )}
    </div>
  );
}
