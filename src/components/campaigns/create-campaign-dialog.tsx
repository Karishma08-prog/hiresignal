"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CirclePlus, X } from "lucide-react";
import { createCampaign, getCampaigns, triggerCampaignRun } from "@/lib/api/campaigns";
import { getSourceOverview } from "@/lib/api/sources";
import {
  getSuggestedRunnableSources,
  inferCountry,
  isLaunchableSource,
  resolveSourceRuntime,
} from "@/lib/source-launch";
import {
  defaultIncludeKeywords,
  defaultObjectiveModes,
  defaultObjectiveSignals,
  defaultTitleGroups,
} from "@/lib/scraper-defaults";

export function CreateCampaignDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    roleQuery: "",
    source: "linkedin",
    location: "India",
    days: 30,
    resultsPerSource: 25,
  });
  const [successMessage, setSuccessMessage] = useState("");
  const [latestRunId, setLatestRunId] = useState<string | null>(null);

  const campaignsQuery = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => getCampaigns(),
  });
  const sourcesQuery = useQuery({
    queryKey: ["source-overview"],
    queryFn: getSourceOverview,
  });

  const sourceMap = useMemo(() => {
    return new Map((sourcesQuery.data ?? []).map((source) => [source.siteKey, source] as const));
  }, [sourcesQuery.data]);
  const sourceOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...(sourcesQuery.data ?? [])
            .filter(
              (source) =>
                isLaunchableSource(source) &&
                resolveSourceRuntime(
                  source.siteKey,
                  new Map([[source.siteKey, source]]),
                ).isRunnable,
            )
            .map((source) => source.siteKey),
          ...(campaignsQuery.data ?? []).flatMap((campaign) => [
            ...(campaign.sourceConfig.searchBoards ?? []),
            ...(campaign.sourceConfig.browserBoards ?? []),
            ...(campaign.sourceConfig.atsBoards ?? []),
          ]),
        ]),
      )
        .filter((source) => {
          const known = sourceMap.get(source);
          return !known || resolveSourceRuntime(source, sourceMap).isRunnable;
        })
        .sort((left, right) => left.localeCompare(right)),
    [campaignsQuery.data, sourceMap, sourcesQuery.data],
  );
  const selectedSourceRuntime = useMemo(
    () => resolveSourceRuntime(form.source, sourceMap),
    [form.source, sourceMap],
  );
  const suggestedSources = useMemo(
    () => getSuggestedRunnableSources(sourcesQuery.data ?? [], 4),
    [sourcesQuery.data],
  );

  const createAndRunMutation = useMutation({
    mutationFn: async () => {
      const sourceRuntime = resolveSourceRuntime(form.source, sourceMap);

      const created = await createCampaign({
        name: form.name.trim(),
        roleQuery: form.roleQuery.trim(),
        country: inferCountry(form.location),
        location: form.location.trim(),
        days: form.days,
        remoteOnly: false,
        resultsPerSource: form.resultsPerSource,
        titleFilterConfig: {
          includeTitles: defaultTitleGroups,
          includeKeywords: defaultIncludeKeywords,
        },
        objectiveFilterConfig: {
          objective: "Find companies with strong market-expansion hiring signals.",
          targetMarket: "US",
          signals: defaultObjectiveSignals,
          mode: defaultObjectiveModes[0]?.key ?? "expansion_hiring",
        },
        sourceConfig: {
          searchBoards: sourceRuntime.launchMode === "search" ? [sourceRuntime.sourceKey] : [],
          browserBoards: sourceRuntime.launchMode === "browser" ? [sourceRuntime.sourceKey] : [],
          atsBoards: sourceRuntime.launchMode === "ats" ? [sourceRuntime.sourceKey] : [],
        },
      });

      const run = await triggerCampaignRun(created.id);
      return { campaign: created, run };
    },
    onSuccess: async ({ campaign, run }) => {
      setLatestRunId(run.id);
      setSuccessMessage(`Created "${campaign.name}" and started run ${run.id}.`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["campaigns"] }),
        queryClient.invalidateQueries({ queryKey: ["campaign-runs"] }),
        queryClient.invalidateQueries({ queryKey: ["companies"] }),
        queryClient.invalidateQueries({ queryKey: ["reports"] }),
        queryClient.invalidateQueries({ queryKey: ["source-overview"] }),
      ]);
    },
  });

  const isFormValid =
    form.name.trim().length >= 2 &&
    form.roleQuery.trim().length >= 2 &&
    form.source.trim().length >= 2 &&
    form.location.trim().length >= 2;
  const canLaunch = isFormValid && selectedSourceRuntime.isRunnable;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSuccessMessage("");
          setLatestRunId(null);
          setOpen(true);
        }}
        className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-blue)] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(37,99,235,0.22)] transition hover:bg-blue-700"
      >
        <CirclePlus className="h-4 w-4" />
        Create New Campaign
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-4xl rounded-[2.2rem] border border-blue-100 bg-white p-8 shadow-[0_24px_60px_rgba(15,15,15,0.18)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-black">
                  New Campaign
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-black">
                  Create and start a campaign
                </h2>
                <p className="mt-2 text-sm leading-7 text-black/70">
                  This creates the campaign in the backend and immediately starts the run.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-blue-100 p-2 text-black/60 transition hover:border-black hover:text-black"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-2">
              <label className="block space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-black/80">Campaign Name</span>
                <input
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  className="w-full rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 outline-none transition focus:border-[var(--brand-blue)] focus:bg-white"
                  placeholder="RevEngineer US Expansion"
                />
              </label>

              <label className="block space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-black/80">Primary Keyword</span>
                <input
                  value={form.roleQuery}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, roleQuery: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 outline-none transition focus:border-[var(--brand-blue)] focus:bg-white"
                  placeholder="Head of Marketing OR VP Marketing"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-black/80">Source</span>
                <input
                  value={form.source}
                  onChange={(event) => setForm((current) => ({ ...current, source: event.target.value }))}
                  list="dashboard-source-options"
                  className="w-full rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 outline-none transition focus:border-[var(--brand-blue)] focus:bg-white"
                />
                <datalist id="dashboard-source-options">
                  {sourceOptions.map((source) => (
                    <option key={source} value={source} />
                  ))}
                </datalist>
              </label>

              <div
                className={[
                  "rounded-[1.25rem] border p-4 text-sm md:col-span-2",
                  selectedSourceRuntime.isRunnable
                    ? "border-blue-100 bg-blue-50 text-black/80"
                    : "border-black bg-white text-black",
                ].join(" ")}
              >
                <p className="font-semibold text-black">
                  Launch mode: {selectedSourceRuntime.launchMode}
                </p>
                <p className="mt-2">
                  {selectedSourceRuntime.isRunnable
                    ? selectedSourceRuntime.note ??
                      `The backend is ready to launch ${selectedSourceRuntime.displayName}.`
                    : selectedSourceRuntime.blockingReason}
                </p>
                {!selectedSourceRuntime.isKnown ? (
                  <p className="mt-2 text-black/60">
                    Custom sources are allowed, but they are treated as generic search boards.
                  </p>
                ) : null}
                {!selectedSourceRuntime.isRunnable && suggestedSources.length ? (
                  <p className="mt-2">
                    Try one of the currently runnable sources:{" "}
                    {suggestedSources.map((source) => source.siteKey).join(", ")}.
                  </p>
                ) : null}
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-black/80">Location</span>
                <input
                  value={form.location}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, location: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 outline-none transition focus:border-[var(--brand-blue)] focus:bg-white"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-black/80">Days</span>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={form.days}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      days: Number(event.target.value || 30),
                    }))
                  }
                  className="w-full rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 outline-none transition focus:border-[var(--brand-blue)] focus:bg-white"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-black/80">Results / Source</span>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={form.resultsPerSource}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      resultsPerSource: Number(event.target.value || 25),
                    }))
                  }
                  className="w-full rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 outline-none transition focus:border-[var(--brand-blue)] focus:bg-white"
                />
              </label>
            </div>

            {successMessage ? (
              <div className="mt-4 rounded-[1.25rem] border border-blue-200 bg-blue-50 p-4 text-sm text-[var(--brand-blue)]">
                <p>{successMessage}</p>
                {latestRunId ? (
                  <div className="mt-3">
                    <Link
                      href={`/campaign-runs/${latestRunId}`}
                      className="inline-flex rounded-full border border-blue-300 bg-white px-4 py-2 font-semibold text-[var(--brand-blue)] transition hover:border-[var(--brand-blue)]"
                    >
                      Open run detail
                    </Link>
                  </div>
                ) : null}
              </div>
            ) : null}

            {createAndRunMutation.isError ? (
              <div className="mt-4 rounded-[1.25rem] border border-black bg-white p-4 text-sm text-black">
                Campaign creation failed. Check that the backend API is running.
              </div>
            ) : null}

            {!isFormValid ? (
              <div className="mt-4 rounded-[1.25rem] border border-blue-200 bg-blue-50 p-4 text-sm text-[var(--brand-blue)]">
                Fill campaign name, keyword, source, and location to create the campaign.
              </div>
            ) : null}

            {isFormValid && !selectedSourceRuntime.isRunnable ? (
              <div className="mt-4 rounded-[1.25rem] border border-black bg-white p-4 text-sm text-black">
                {selectedSourceRuntime.blockingReason}
              </div>
            ) : null}

            <div className="mt-8 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-black transition hover:border-black"
              >
                Create a campaign later
              </button>
              <button
                type="button"
                disabled={!canLaunch || createAndRunMutation.isPending}
                onClick={() => createAndRunMutation.mutate()}
                className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {createAndRunMutation.isPending ? "Creating..." : "Create a Campaign"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

