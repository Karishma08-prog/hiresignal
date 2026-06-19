"use client";

import Link from "next/link";
import axios from "axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { TagEditor } from "@/components/scraper/tag-editor";
import {
  createCampaign,
  getCampaignRun,
  triggerCampaignRun,
} from "@/lib/api/campaigns";
import { getSourceOverview } from "@/lib/api/sources";
import {
  formatSourceLabel,
  getAllRunnableSourceConfig,
  inferCountry,
  inferSourceLaunchMode,
} from "@/lib/source-launch";
import { LOCATION_OPTIONS } from "@/lib/location-options";
import type { SourceOverview } from "@/lib/types/source";

const campaignSchema = z.object({
  campaignName: z.string().min(2, "Campaign name is required."),
  primaryKeyword: z.string().min(2, "Keyword is required."),
  location: z.string().min(2, "Location is required."),
  days: z.number().min(1, "Days must be at least 1.").max(90, "Days must be 90 or less."),
  sourceSelection: z.string().min(1, "Source is required."),
});

type CampaignFormValues = z.infer<typeof campaignSchema>;

type CampaignFormProps = {
  selectedTitles: string[];
  onTitlesChange: (values: string[]) => void;
  objectiveMode: string;
  objectiveText: string;
  objectiveSignals: string[];
  targetMarket: string;
  defaultQuery: string;
};

const DEFAULT_RESULTS_LIMIT = 100;

export function CampaignForm({
  selectedTitles,
  onTitlesChange,
  objectiveMode,
  objectiveText,
  objectiveSignals,
  targetMarket,
  defaultQuery,
}: CampaignFormProps) {
  const queryClient = useQueryClient();
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>("");

  function getMutationErrorMessage() {
    if (!createAndRunMutation.error) {
      return "";
    }

    if (axios.isAxiosError(createAndRunMutation.error)) {
      const detail = createAndRunMutation.error.response?.data?.detail;
      if (typeof detail === "string" && detail.trim()) {
        return detail;
      }
      if (Array.isArray(detail) && detail.length > 0) {
        return detail
          .map((item) => item?.msg)
          .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
          .join(" ");
      }
      if (createAndRunMutation.error.message) {
        return createAndRunMutation.error.message;
      }
    }

    return "Campaign launch failed. Please try again.";
  }
  const sourcesQuery = useQuery({
    queryKey: ["source-overview"],
    queryFn: getSourceOverview,
  });

  const locationOptions = LOCATION_OPTIONS;

  const allSourceConfig = useMemo(
    () => getAllRunnableSourceConfig(sourcesQuery.data ?? []),
    [sourcesQuery.data],
  );
  const allRunnableSources = useMemo(
    () =>
      [
        ...allSourceConfig.searchBoards,
        ...allSourceConfig.browserBoards,
        ...allSourceConfig.atsBoards,
      ].sort((left, right) => left.localeCompare(right)),
    [allSourceConfig],
  );
  const sourceMap = useMemo(
    () => new Map((sourcesQuery.data ?? []).map((source) => [source.siteKey.toLowerCase(), source])),
    [sourcesQuery.data],
  );

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      campaignName: "",
      primaryKeyword: defaultQuery,
      location: "Entire world",
      days: 30,
      sourceSelection: "all",
    },
  });

  const selectedSourceValue = useWatch({ control, name: "sourceSelection" });
  const hasObjectiveSignals = objectiveSignals.length > 0;
  const hasSelectedTitles = selectedTitles.length > 0;
  const selectedSource = useMemo(() => {
    if (!selectedSourceValue || selectedSourceValue === "all") {
      return null;
    }
    return sourceMap.get(selectedSourceValue.toLowerCase()) ?? null;
  }, [selectedSourceValue, sourceMap]);
  const sourceConfig = useMemo(() => {
    if (!selectedSource) {
      return allSourceConfig;
    }

    const sourceKey = selectedSource.siteKey.toLowerCase();
    const launchMode = inferSourceLaunchMode(selectedSource as SourceOverview);
    if (launchMode === "ats") {
      return { searchBoards: [], browserBoards: [], atsBoards: [sourceKey] };
    }
    if (launchMode === "browser") {
      return { searchBoards: [], browserBoards: [sourceKey], atsBoards: [] };
    }
    return { searchBoards: [sourceKey], browserBoards: [], atsBoards: [] };
  }, [allSourceConfig, selectedSource]);
  const activeSourceKeys = useMemo(() => {
    if (!selectedSource) {
      return allRunnableSources;
    }
    return [selectedSource.siteKey.toLowerCase()];
  }, [allRunnableSources, selectedSource]);
  const hasRunnableSources = activeSourceKeys.length > 0;
  const sourceOptions = useMemo(
    () => [
      { value: "all", label: "All runnable sources" },
      ...allRunnableSources.map((sourceKey) => ({
        value: sourceKey,
        label: formatSourceLabel(sourceKey),
      })),
    ],
    [allRunnableSources],
  );

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
      const created = await createCampaign({
        name: values.campaignName,
        roleQuery: values.primaryKeyword,
        country: inferCountry(values.location),
        location: values.location,
        days: values.days,
        remoteOnly: false,
        resultsPerSource: DEFAULT_RESULTS_LIMIT,
        titleFilterConfig: {
          includeTitles: selectedTitles,
          includeKeywords: [],
        },
        objectiveFilterConfig: {
          objective: objectiveText,
          targetMarket,
          signals: objectiveSignals,
          mode: objectiveMode,
        },
        sourceConfig,
      });

      const run = await triggerCampaignRun(created.id);
      return { campaign: created, run };
    },
    onSuccess: async ({ campaign, run }) => {
      setActiveRunId(run.id);
      setSuccessMessage(
        `Created "${campaign.name}" and started run ${run.id} across ${activeSourceKeys.length} source${activeSourceKeys.length === 1 ? "" : "s"}.`,
      );
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
    setSuccessMessage("");
    createAndRunMutation.mutate(values);
  });

  const sourcePreview = activeSourceKeys.slice(0, 12);

  return (
    <section
      id="create-campaign"
      className="scroll-mt-24 rounded-[1.9rem] border border-blue-100 bg-white p-6 shadow-[0_12px_28px_rgba(15,15,15,0.05)]"
    >
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-black">Scrape</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-black">
          Launch a new sourcing run
        </h2>
        <p className="mt-2 text-sm leading-7 text-black/70">
          This form creates the campaign in the backend and immediately triggers a run across all
          currently active launchable sources. Add role titles and business signals manually so the
          run reflects your exact use case.
        </p>
      </div>

      <form className="space-y-5" onSubmit={onSubmit}>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-black/80">Campaign Name</span>
          <input
            {...register("campaignName")}
            className="w-full rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 outline-none transition focus:border-[var(--brand-blue)] focus:bg-white"
            placeholder="USA Finance Leadership Sweep"
          />
          {errors.campaignName ? (
            <span className="text-sm text-black">{errors.campaignName.message}</span>
          ) : null}
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-black/80">Primary Keyword / Query</span>
            <input
              {...register("primaryKeyword")}
              className="w-full rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 outline-none transition focus:border-[var(--brand-blue)] focus:bg-white"
              placeholder='Chief Financial Officer OR CFO OR "VP Finance"'
            />
            <p className="text-xs leading-6 text-black/60">
              This query drives the underlying search, while the manual role titles below help the
              backend score title relevance.
            </p>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-black/80">Location</span>
            <select
              {...register("location")}
              className="w-full rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 outline-none transition focus:border-[var(--brand-blue)] focus:bg-white"
            >
              {locationOptions.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
            <p className="text-xs leading-6 text-black/60">
              Choose `Entire world` for global coverage, or pick a specific country from the full
              list.
            </p>
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
            <div className="flex flex-wrap gap-2">
              {[7, 14, 30, 60, 90].map((days) => (
                <button
                  type="button"
                  key={days}
                  onClick={() => setValue("days", days, { shouldValidate: true })}
                  className="rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs font-semibold text-black/70 transition hover:border-black hover:text-black"
                >
                  {days} days
                </button>
              ))}
            </div>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-black/80">Source</span>
            <select
              {...register("sourceSelection")}
              className="w-full rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 outline-none transition focus:border-[var(--brand-blue)] focus:bg-white"
            >
              {sourceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

        </div>

        {(errors.primaryKeyword || errors.location || errors.days) ? (
          <div className="rounded-[1.25rem] border border-black bg-white p-4 text-sm text-black">
            {errors.primaryKeyword?.message ??
              errors.location?.message ??
              errors.days?.message}
          </div>
        ) : null}

        <TagEditor
          label="Role Titles"
          values={selectedTitles}
          onChange={onTitlesChange}
          placeholder="Add a role title and press Enter"
          helperText="Add the exact titles you want to target. Examples: `Chief Financial Officer`, `VP Finance`, `Head of Marketing`, `Chief Revenue Officer`."
          suggestions={[
            "Chief Financial Officer",
            "VP Finance",
            "Head of Finance",
            "Director of Finance",
            "Chief Accounting Officer",
            "Controller",
            "Chief Revenue Officer",
            "VP Sales",
            "Head of Marketing",
          ]}
          emptyMessage="Add the role titles you want the backend to treat as relevant matches."
          maxVisibleSuggestions={6}
        />

        {!hasSelectedTitles ? (
          <div className="rounded-[1.25rem] border border-black bg-white p-4 text-sm text-black">
            Add at least one role title before launching the scrape.
          </div>
        ) : null}

        {!hasObjectiveSignals ? (
          <div className="rounded-[1.25rem] border border-black bg-white p-4 text-sm text-black">
            Add at least one signal keyword so the run can score business intent correctly.
          </div>
        ) : null}

        <div className="rounded-[1.25rem] border border-blue-100 bg-white p-4 text-sm text-black/80">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-black/60">
            Runnable Sources
          </p>
          <p className="mt-2 text-sm font-medium text-black">
            {activeSourceKeys.length} active source{activeSourceKeys.length === 1 ? "" : "s"} {activeSourceKeys.length === 1 ? "is" : "are"} ready for this scrape.
          </p>
          {hasRunnableSources ? (
            <>
              <p className="mt-2 text-sm text-black/60">
                Search: {sourceConfig.searchBoards.length} | Browser: {sourceConfig.browserBoards.length} | ATS: {sourceConfig.atsBoards.length}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {sourcePreview.map((sourceKey) => (
                  <span
                    key={sourceKey}
                    className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-black/80"
                  >
                    {formatSourceLabel(sourceKey)}
                  </span>
                ))}
                {activeSourceKeys.length > sourcePreview.length ? (
                  <span className="rounded-full border border-blue-100 bg-white px-3 py-1 text-xs font-semibold text-black/60">
                    +{activeSourceKeys.length - sourcePreview.length} more
                  </span>
                ) : null}
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-black/60">
              No runnable sources are currently available from the backend environment.
            </p>
          )}
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

        {createAndRunMutation.isError ? (
          <div className="rounded-[1.25rem] border border-black bg-white p-4 text-sm text-black">
            {getMutationErrorMessage()}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-black/60">
            {runStatusQuery.data ? `Latest run status: ${runStatusQuery.data.status}` : "Ready to launch"}
          </div>
          <button
            type="submit"
            disabled={
              createAndRunMutation.isPending ||
              !hasRunnableSources ||
              !hasSelectedTitles ||
              !hasObjectiveSignals
            }
            className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {createAndRunMutation.isPending ? "Launching..." : "Launch Sourcing Run"}
          </button>
        </div>
      </form>
    </section>
  );
}
