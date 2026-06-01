"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCampaignRuns, getCampaigns } from "@/lib/api/campaigns";
import { CampaignForm } from "@/components/scraper/campaign-form";
import { ObjectiveFilter } from "@/components/scraper/objective-filter";
import { TitleFilter } from "@/components/scraper/title-filter";
import { DataTable } from "@/components/shared/data-table";
import { LoadingState } from "@/components/shared/loading-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { isActiveRunStatus } from "@/lib/run-mode";
import {
  defaultIncludeKeywords,
  defaultObjectiveModes,
  defaultObjectiveSignals,
  defaultTitleGroups,
} from "@/lib/scraper-defaults";

export default function ScraperPage() {
  const [selectedTitles, setSelectedTitles] = useState<string[]>(defaultTitleGroups);
  const [includeKeywords, setIncludeKeywords] = useState<string[]>(defaultIncludeKeywords);
  const [selectedObjectiveSignals, setSelectedObjectiveSignals] =
    useState<string[]>(defaultObjectiveSignals);
  const [selectedObjectiveMode, setSelectedObjectiveMode] = useState<string>(
    defaultObjectiveModes[0]?.key ?? "expansion_hiring",
  );
  const [objectiveText, setObjectiveText] = useState(
    "Find companies with strong market-expansion hiring signals.",
  );
  const [targetMarket, setTargetMarket] = useState("US");

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
    return {
      id: campaign.id,
      name: campaign.name,
      status: run?.status ?? campaign.status,
      sourceCount:
        (campaign.sourceConfig.searchBoards?.length ?? 0) +
        (campaign.sourceConfig.browserBoards?.length ?? 0) +
        (campaign.sourceConfig.atsBoards?.length ?? 0),
      jobsFound: run?.matchedJobCount ?? 0,
    };
  });

  function toggleTitle(title: string) {
    setSelectedTitles((current) =>
      current.includes(title) ? current.filter((item) => item !== title) : [...current, title],
    );
  }

  function selectAllTitles() {
    setSelectedTitles(defaultTitleGroups);
  }

  function clearTitles() {
    setSelectedTitles([]);
  }

  function toggleObjectiveSignal(signal: string) {
    setSelectedObjectiveSignals((current) =>
      current.includes(signal)
        ? current.filter((item) => item !== signal)
        : [...current, signal],
    );
  }

  function selectAllObjectiveSignals() {
    setSelectedObjectiveSignals(defaultObjectiveSignals);
  }

  function clearObjectiveSignals() {
    setSelectedObjectiveSignals([]);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scraper"
        description="Build a lead campaign from company-specific hire signals. Choose the titles, objective, geography, and boards that reveal who is hiring into your target motion."
      />

      <section className="grid gap-5 xl:grid-cols-[1.35fr_1fr_1fr]">
        <CampaignForm
          selectedTitles={selectedTitles}
          includeKeywords={includeKeywords}
          objectiveMode={selectedObjectiveMode}
          objectiveText={objectiveText}
          objectiveSignals={selectedObjectiveSignals}
          targetMarket={targetMarket}
        />
        <TitleFilter
          titleGroups={defaultTitleGroups}
          selectedTitles={selectedTitles}
          includeKeywords={includeKeywords}
          onToggleTitle={toggleTitle}
          onSelectAllTitles={selectAllTitles}
          onClearTitles={clearTitles}
          onKeywordsChange={setIncludeKeywords}
        />
        <ObjectiveFilter
          objectiveModes={defaultObjectiveModes}
          selectedMode={selectedObjectiveMode}
          objectiveText={objectiveText}
          targetMarket={targetMarket}
          signals={defaultObjectiveSignals}
          selectedSignals={selectedObjectiveSignals}
          onModeChange={setSelectedObjectiveMode}
          onObjectiveTextChange={setObjectiveText}
          onTargetMarketChange={setTargetMarket}
          onToggleSignal={toggleObjectiveSignal}
          onSelectAllSignals={selectAllObjectiveSignals}
          onClearSignals={clearObjectiveSignals}
        />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight text-black">
            Recent scrape runs
          </h2>
          <p className="text-sm text-black/60">Live backend runs</p>
        </div>
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
      </section>
    </div>
  );
}

