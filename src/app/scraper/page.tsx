"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCampaignRuns, getCampaigns } from "@/lib/api/campaigns";
import { normalizeCampaignSourceConfig } from "@/lib/campaign-normalize";
import { CampaignForm } from "@/components/scraper/campaign-form";
import { ObjectiveFilter } from "@/components/scraper/objective-filter";
import { ClientErrorBoundary } from "@/components/shared/client-error-boundary";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { isActiveRunStatus } from "@/lib/run-mode";
import {
  defaultObjectiveModes,
  defaultObjectiveSignalLibrary,
} from "@/lib/scraper-defaults";

function normalizeUniqueValues(values: string[]) {
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) {
      continue;
    }

    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    ordered.push(trimmed);
  }

  return ordered;
}

export default function ScraperPage() {
  const initialObjectiveMode = defaultObjectiveModes[0];
  const [selectedTitles, setSelectedTitles] = useState<string[]>([]);
  const [selectedObjectiveSignals, setSelectedObjectiveSignals] = useState<string[]>([]);
  const [selectedObjectiveMode, setSelectedObjectiveMode] = useState<string>(
    initialObjectiveMode?.key ?? "expansion_hiring",
  );
  const [objectiveText, setObjectiveText] = useState(
    initialObjectiveMode?.defaultObjective ??
      "Find companies with strong business-change hiring signals.",
  );
  const [targetMarket, setTargetMarket] = useState("All target accounts");

  const campaignsQuery = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => getCampaigns(12),
  });

  const runsQuery = useQuery({
    queryKey: ["campaign-runs"],
    queryFn: () => getCampaignRuns(undefined, 12),
    refetchInterval: (query) => {
      const items = query.state.data ?? [];
      return items.some((run) => isActiveRunStatus(run.status)) ? 4_000 : false;
    },
  });

  const runEntries = (runsQuery.data ?? []).map((run) => [run.id, run] as const);
  const runMap = new Map(runEntries);

  const rows = (campaignsQuery.data ?? []).map((campaign) => {
    const run = campaign.lastRunId ? runMap.get(campaign.lastRunId) : undefined;
    const sourceConfig = normalizeCampaignSourceConfig(campaign);
    return {
      id: campaign.id,
      name: campaign.name,
      status: run?.status ?? campaign.status,
      sourceCount:
        sourceConfig.searchBoards.length +
        sourceConfig.browserBoards.length +
        sourceConfig.atsBoards.length,
      jobsFound: run?.matchedJobCount ?? 0,
    };
  });

  const widgetFallback = (
    <EmptyState
      title="This scraper section could not render"
      description="The rest of the page is still available. Refresh once, or continue from Campaigns and Reports while we isolate the failing widget."
    />
  );

  function changeObjectiveMode(modeKey: string) {
    const mode = defaultObjectiveModes.find((item) => item.key === modeKey);
    const previousMode = defaultObjectiveModes.find((item) => item.key === selectedObjectiveMode);
    setSelectedObjectiveMode(modeKey);
    if (!mode) {
      return;
    }
    setObjectiveText((current) =>
      !current.trim() || current === previousMode?.defaultObjective ? mode.defaultObjective : current,
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scraper"
        description="Build a manual sourcing campaign with role titles, business signals, global geography, and live source coverage in one place."
      />

      <section className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        <ClientErrorBoundary fallback={widgetFallback}>
          <CampaignForm
            selectedTitles={selectedTitles}
            onTitlesChange={(values) => setSelectedTitles(normalizeUniqueValues(values))}
            objectiveMode={selectedObjectiveMode}
            objectiveText={objectiveText}
            objectiveSignals={selectedObjectiveSignals}
            targetMarket={targetMarket}
            defaultQuery=""
          />
        </ClientErrorBoundary>
        <ClientErrorBoundary fallback={widgetFallback}>
          <ObjectiveFilter
            objectiveModes={defaultObjectiveModes}
            selectedMode={selectedObjectiveMode}
            objectiveText={objectiveText}
            targetMarket={targetMarket}
            signals={defaultObjectiveSignalLibrary}
            selectedSignals={selectedObjectiveSignals}
            onModeChange={changeObjectiveMode}
            onObjectiveTextChange={setObjectiveText}
            onTargetMarketChange={setTargetMarket}
            onSignalsChange={(values) => setSelectedObjectiveSignals(normalizeUniqueValues(values))}
            onSelectAllSignals={() => setSelectedObjectiveSignals(defaultObjectiveSignalLibrary)}
            onClearSignals={() => setSelectedObjectiveSignals([])}
          />
        </ClientErrorBoundary>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight text-black">Recent scrape runs</h2>
          <p className="text-sm text-black/60">Live backend runs</p>
        </div>
        <ClientErrorBoundary fallback={widgetFallback}>
          {campaignsQuery.isLoading || runsQuery.isLoading ? (
            <LoadingState label="Loading recent campaigns..." />
          ) : (
            <DataTable
              columns={[
                { key: "name", header: "Campaign" },
                {
                  key: "status",
                  header: "Status",
                  render: (row) => <StatusBadge status={String(row.status)} />,
                },
                { key: "sourceCount", header: "Sources" },
                { key: "jobsFound", header: "Jobs Found" },
              ]}
              rows={rows}
              emptyMessage="No scraper runs have been recorded yet."
            />
          )}
        </ClientErrorBoundary>
      </section>
    </div>
  );
}
