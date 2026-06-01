"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import {
  createCampaign,
  getCampaignRun,
  getCampaigns,
  launchFreeZeroConfigCampaign,
  triggerCampaignRun,
} from "@/lib/api/campaigns";
import { getSourceOverview } from "@/lib/api/sources";
import {
  getSuggestedRunnableSources,
  inferCountry,
  isLaunchableSource,
  resolveSourceRuntime,
} from "@/lib/source-launch";
import { sourcePresetOptions } from "@/lib/scraper-defaults";

const campaignSchema = z.object({
  campaignName: z.string().min(2, "Campaign name is required."),
  primaryKeyword: z.string().min(2, "Keyword is required."),
  sourcePreset: z.string().min(2, "Preset is required."),
  source: z.string().min(2, "Source is required."),
  location: z.string().min(2, "Location is required."),
  days: z.number().min(1, "Days must be at least 1.").max(90, "Days must be 90 or less."),
  resultsPerSource: z.number()
    .min(1, "Results per source must be at least 1.")
    .max(200, "Results per source must be 200 or less."),
});

type CampaignFormValues = z.infer<typeof campaignSchema>;

type CampaignFormProps = {
  selectedTitles: string[];
  includeKeywords: string[];
  objectiveMode: string;
  objectiveText: string;
  objectiveSignals: string[];
  targetMarket: string;
};
export function CampaignForm({
  selectedTitles,
  includeKeywords,
  objectiveMode,
  objectiveText,
  objectiveSignals,
  targetMarket,
}: CampaignFormProps) {
  const queryClient = useQueryClient();
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>("");

  const campaignsQuery = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => getCampaigns(),
  });
  const sourcesQuery = useQuery({
    queryKey: ["source-overview"],
    queryFn: getSourceOverview,
  });

  const campaignOptions = (campaignsQuery.data ?? []).map((campaign) => ({
    id: campaign.id,
    name: campaign.name,
    primaryKeyword: campaign.roleQuery,
    source:
      campaign.sourceConfig.searchBoards?.[0] ??
      campaign.sourceConfig.browserBoards?.[0] ??
      campaign.sourceConfig.atsBoards?.[0] ??
      "linkedin",
    location: campaign.location,
    days: campaign.days,
    resultsPerSource: campaign.resultsPerSource,
  }));
  const campaignNameOptions = Array.from(
    new Map(campaignOptions.map((campaign) => [campaign.name, campaign])).values(),
  );

  const primaryKeywordOptions = Array.from(
    new Set(campaignOptions.map((campaign) => campaign.primaryKeyword)),
  );
  const locationOptions = Array.from(new Set(campaignOptions.map((campaign) => campaign.location)));

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

  const suggestedSources = useMemo(
    () => getSuggestedRunnableSources(sourcesQuery.data ?? [], 4),
    [sourcesQuery.data],
  );
  const preferredRunnableSource = suggestedSources[0]?.siteKey ?? sourceOptions[0] ?? "linkedin";

  const {
    register,
    handleSubmit,
    control,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      campaignName: campaignOptions[0]?.name ?? "",
      primaryKeyword: campaignOptions[0]?.primaryKeyword ?? "",
      sourcePreset: "single_source",
      source: campaignOptions[0]?.source ?? sourcesQuery.data?.[0]?.siteKey ?? "linkedin",
      location: campaignOptions[0]?.location ?? "India",
      days: campaignOptions[0]?.days ?? 30,
      resultsPerSource: campaignOptions[0]?.resultsPerSource ?? 25,
    },
  });

  const selectedCampaignName = useWatch({ control, name: "campaignName" });
  const selectedSourcePreset = useWatch({ control, name: "sourcePreset" });
  const selectedSource = useWatch({ control, name: "source" });
  const selectedSourceRuntime = useMemo(
    () => resolveSourceRuntime(selectedSource ?? "", sourceMap),
    [selectedSource, sourceMap],
  );

  useEffect(() => {
    const currentName = getValues("campaignName");
    if (currentName || !campaignOptions.length) {
      return;
    }

    const fallbackCampaign = campaignOptions[0];
    setValue("campaignName", fallbackCampaign.name, { shouldValidate: true });
    setValue("primaryKeyword", fallbackCampaign.primaryKeyword, { shouldValidate: true });
    setValue("source", fallbackCampaign.source, { shouldValidate: true });
    setValue("location", fallbackCampaign.location, { shouldValidate: true });
    setValue("days", fallbackCampaign.days ?? 30, { shouldValidate: true });
    setValue("resultsPerSource", fallbackCampaign.resultsPerSource ?? 25, {
      shouldValidate: true,
    });
  }, [campaignOptions, getValues, setValue]);

  useEffect(() => {
    const currentSource = getValues("source");
    if (selectedSourcePreset === "free_zero_config") {
      return;
    }
    if (!currentSource || !resolveSourceRuntime(currentSource, sourceMap).isRunnable) {
      setValue("source", preferredRunnableSource, { shouldValidate: true });
    }
  }, [getValues, preferredRunnableSource, selectedSourcePreset, setValue, sourceMap]);

  useEffect(() => {
    const selectedCampaign = campaignOptions.find(
      (campaign) => campaign.name === selectedCampaignName,
    );
    if (!selectedCampaign) {
      return;
    }
    setValue("primaryKeyword", selectedCampaign.primaryKeyword, { shouldValidate: true });
    setValue("source", selectedCampaign.source, { shouldValidate: true });
    setValue("location", selectedCampaign.location, { shouldValidate: true });
    setValue("days", selectedCampaign.days ?? 30, { shouldValidate: true });
    setValue("resultsPerSource", selectedCampaign.resultsPerSource ?? 25, { shouldValidate: true });
  }, [campaignOptions, selectedCampaignName, setValue]);

  const runStatusQuery = useQuery({
    queryKey: ["campaign-run", activeRunId],
    queryFn: () => getCampaignRun(String(activeRunId)),
    enabled: Boolean(activeRunId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && ["completed", "failed"].includes(status) ? false : 4000;
    },
  });

  const createAndRunMutation = useMutation({
    mutationFn: async (values: CampaignFormValues) => {
      if (values.sourcePreset === "free_zero_config") {
        return launchFreeZeroConfigCampaign({
          name: values.campaignName,
          roleQuery: values.primaryKeyword,
          country: inferCountry(values.location),
          location: values.location,
          days: values.days,
          remoteOnly: false,
          resultsPerSource: values.resultsPerSource,
          titleFilterConfig: {
            includeTitles: selectedTitles,
            includeKeywords,
          },
          objectiveFilterConfig: {
            objective: objectiveText,
            targetMarket,
            signals: objectiveSignals,
            mode: objectiveMode,
          },
          triggeredBy: "frontend_free_zero_config",
        });
      }

      const sourceRuntime = resolveSourceRuntime(values.source, sourceMap);

      const created = await createCampaign({
        name: values.campaignName,
        roleQuery: values.primaryKeyword,
        country: inferCountry(values.location),
        location: values.location,
        days: values.days,
        remoteOnly: false,
        resultsPerSource: values.resultsPerSource,
        titleFilterConfig: {
          includeTitles: selectedTitles,
          includeKeywords,
        },
        objectiveFilterConfig: {
          objective: objectiveText,
          targetMarket,
          signals: objectiveSignals,
          mode: objectiveMode,
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
      setActiveRunId(run.id);
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

  const onSubmit = handleSubmit((values) => {
    if (values.sourcePreset !== "free_zero_config" && !selectedSourceRuntime.isRunnable) {
      return;
    }
    setSuccessMessage("");
    createAndRunMutation.mutate(values);
  });

  return (
    <section
      id="create-campaign"
      className="scroll-mt-24 rounded-[1.9rem] border border-blue-100 bg-white p-6 shadow-[0_12px_28px_rgba(15,15,15,0.05)]"
    >
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-black">
          Scrape
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-black">
          Launch a new sourcing run
        </h2>
        <p className="mt-2 text-sm leading-7 text-black/70">
          This form now creates the campaign in the backend and immediately triggers a run.
        </p>
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-black/80">Campaign Name</span>
          <input
            {...register("campaignName")}
            list="campaign-presets"
            className="w-full rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 outline-none transition focus:border-[var(--brand-blue)] focus:bg-white"
          />
          <datalist id="campaign-presets">
            {campaignNameOptions.map((campaign) => (
              <option key={campaign.id} value={campaign.name} />
            ))}
          </datalist>
          {errors.campaignName ? (
            <span className="text-sm text-black">{errors.campaignName.message}</span>
          ) : null}
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-black/80">Source Preset</span>
            <select
              {...register("sourcePreset")}
              className="w-full rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 outline-none transition focus:border-[var(--brand-blue)] focus:bg-white"
            >
              {sourcePresetOptions.map((preset) => (
                <option key={preset.key} value={preset.key}>
                  {preset.title}
                </option>
              ))}
            </select>
            <p className="text-xs leading-6 text-black/60">
              {sourcePresetOptions.find((preset) => preset.key === selectedSourcePreset)?.description}
            </p>
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-black/80">Primary Keyword</span>
            <input
              {...register("primaryKeyword")}
              list="keyword-presets"
              className="w-full rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 outline-none transition focus:border-[var(--brand-blue)] focus:bg-white"
            />
            <datalist id="keyword-presets">
              {primaryKeywordOptions.map((keyword) => (
                <option key={keyword} value={keyword} />
              ))}
            </datalist>
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-black/80">Source</span>
            <input
              {...register("source")}
              list="source-presets"
              disabled={selectedSourcePreset === "free_zero_config"}
              className="w-full rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 outline-none transition focus:border-[var(--brand-blue)] focus:bg-white"
            />
            <datalist id="source-presets">
              {sourceOptions.map((source) => (
                <option key={source} value={source} />
              ))}
            </datalist>
            {selectedSourcePreset === "free_zero_config" ? (
              <p className="text-xs leading-6 text-black/60">
                This preset ignores the single source field and launches across all 30 free boards.
              </p>
            ) : null}
          </label>
        </div>

        {selectedSourcePreset !== "free_zero_config" ? (
          <div
            className={[
              "rounded-[1.25rem] border p-4 text-sm",
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
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          <label className="block space-y-2 md:col-span-1">
            <span className="text-sm font-medium text-black/80">Location</span>
            <input
              {...register("location")}
              list="location-presets"
              className="w-full rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 outline-none transition focus:border-[var(--brand-blue)] focus:bg-white"
            />
            <datalist id="location-presets">
              {locationOptions.map((location) => (
                <option key={location} value={location} />
              ))}
            </datalist>
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-black/80">Days</span>
            <input
              type="number"
              min={1}
              max={90}
              {...register("days", { valueAsNumber: true })}
              className="w-full rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 outline-none transition focus:border-[var(--brand-blue)] focus:bg-white"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-black/80">Results / Source</span>
            <input
              type="number"
              min={1}
              max={200}
              {...register("resultsPerSource", { valueAsNumber: true })}
              className="w-full rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 outline-none transition focus:border-[var(--brand-blue)] focus:bg-white"
            />
          </label>
        </div>

        {(errors.primaryKeyword || errors.source || errors.location || errors.days || errors.resultsPerSource) ? (
          <div className="rounded-[1.25rem] border border-black bg-white p-4 text-sm text-black">
            {errors.primaryKeyword?.message ??
              errors.source?.message ??
              errors.location?.message ??
              errors.days?.message ??
              errors.resultsPerSource?.message}
          </div>
        ) : null}

        <div className="rounded-[1.5rem] border border-blue-100 bg-blue-50 p-4 text-sm leading-7 text-black/80">
          The campaign is created with the title and objective settings currently selected on this
          page, then immediately queued for import and reporting.
          {selectedSourcePreset === "free_zero_config"
            ? " In free-zero-config mode, the backend launches the run across the current healthy zero-config source set for this machine."
            : null}
        </div>

        {successMessage ? (
          <div className="rounded-[1.25rem] border border-blue-200 bg-blue-50 p-4 text-sm text-[var(--brand-blue)]">
            <p>{successMessage}</p>
            {activeRunId ? (
              <div className="mt-3">
                <Link
                  href={`/campaign-runs/${activeRunId}`}
                  className="inline-flex rounded-full border border-blue-300 bg-white px-4 py-2 font-semibold text-[var(--brand-blue)] transition hover:border-[var(--brand-blue)]"
                >
                  Open run detail
                </Link>
              </div>
            ) : null}
          </div>
        ) : null}

        {runStatusQuery.data ? (
          <div className="rounded-[1.25rem] border border-blue-100 bg-white p-4 text-sm text-black/80">
            <p className="font-semibold text-black">Latest run status</p>
            <p className="mt-2">
              Status: <span className="font-medium">{runStatusQuery.data.status}</span>
            </p>
            <p className="mt-1">Jobs imported: {runStatusQuery.data.matchedJobCount}</p>
            <p className="mt-1">Companies imported: {runStatusQuery.data.companyCount}</p>
            <p className="mt-2 text-black/60">
              {runStatusQuery.data.runNotes ?? "Run is still processing."}
            </p>
          </div>
        ) : null}

        {createAndRunMutation.isError ? (
          <div className="rounded-[1.25rem] border border-black bg-white p-4 text-sm text-black">
            Campaign creation failed. Check that the backend API is running and reachable.
          </div>
        ) : null}

        <button
          type="submit"
          disabled={
            createAndRunMutation.isPending ||
            (selectedSourcePreset !== "free_zero_config" && !selectedSourceRuntime.isRunnable)
          }
          className="w-full rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          {createAndRunMutation.isPending
            ? "Starting..."
            : selectedSourcePreset === "free_zero_config"
              ? "Launch Free 30 Preset"
              : "Start Scrape"}
        </button>
      </form>
    </section>
  );
}

