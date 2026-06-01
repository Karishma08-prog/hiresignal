import type { SourceOverview } from "@/lib/types/source";

export type SourceLaunchMode = "search" | "browser" | "ats";

export type SelectedSourceRuntime = {
  sourceKey: string;
  displayName: string;
  launchMode: SourceLaunchMode;
  isKnown: boolean;
  isRunnable: boolean;
  blockingReason: string | null;
  note: string | null;
};

const RUNNABLE_WORKING_STATUSES = new Set([
  "working",
  "working_for_use_case",
  "working_but_not_for_current_query",
  "working_via_existing_results",
]);

const RUNNABLE_SUPPORT_TIERS = new Set([
  "live_supported",
  "fallback_supported",
]);

export function normalizeSourceKey(value: string) {
  return value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

export function inferCountry(location: string) {
  const normalized = location.toLowerCase();
  if (normalized.includes("india")) return "INDIA";
  if (normalized.includes("uk")) return "UK";
  if (normalized.includes("europe")) return "UK";
  return "USA";
}

export function isLaunchableSource(source: SourceOverview) {
  return source.engine !== "script_bridge";
}

export function inferSourceLaunchMode(source: Pick<SourceOverview, "category" | "engine"> | null | undefined): SourceLaunchMode {
  if (source?.category === "ats" || source?.engine === "ats_api") {
    return "ats";
  }
  if (source?.engine === "botasaurus") {
    return "browser";
  }
  return "search";
}

export function resolveSourceRuntime(
  rawValue: string,
  sourceMap: Map<string, SourceOverview>,
): SelectedSourceRuntime {
  const sourceKey = normalizeSourceKey(rawValue);
  const source = sourceMap.get(sourceKey);

  if (!source) {
    return {
      sourceKey,
      displayName: sourceKey || rawValue.trim() || "Custom source",
      launchMode: "search",
      isKnown: false,
      isRunnable: true,
      blockingReason: null,
      note: "This source is not in the backend registry yet, so it will be treated as a generic search board.",
    };
  }

  const launchMode = inferSourceLaunchMode(source);
  const launchable = isLaunchableSource(source);
  const setupBlocked = source.workingStatus === "needs_setup";
  const provenWorking = RUNNABLE_WORKING_STATUSES.has(source.workingStatus);
  const supportTier = source.supportTier?.toLowerCase() ?? "";
  const degraded =
    !provenWorking &&
    (source.status === "failed" ||
      source.workingStatus === "failing_or_unreliable" ||
      Boolean(source.lastErrorMessage));
  const credentialReady =
    source.status === "running" ||
    source.status === "ready" ||
    provenWorking ||
    source.credentialPresent ||
    Boolean(source.credentialVerifiedAt) ||
    (!source.needsApiKey && !source.needsProxy && launchMode === "search");
  const tierAllowsLaunch =
    !supportTier ||
    RUNNABLE_SUPPORT_TIERS.has(supportTier) ||
    source.status === "running";
  const isRunnable = launchable && !setupBlocked && !degraded && credentialReady && tierAllowsLaunch;

  let blockingReason: string | null = null;
  if (!launchable) {
    blockingReason = "This source came from imported output data and cannot be launched directly.";
  } else if (setupBlocked) {
    blockingReason =
      source.credentialNote ??
      (launchMode === "ats"
        ? "ATS discovery is not configured in the backend environment."
        : launchMode === "browser"
          ? "Browser-backed scraping is missing its proxy configuration."
          : "This source is missing required backend configuration.");
  } else if (!tierAllowsLaunch) {
    blockingReason =
      source.supportReason ??
      "This source is still experimental in the current backend environment.";
  } else if (degraded) {
    blockingReason =
      source.lastErrorMessage ??
      source.credentialNote ??
      "This source is currently degraded in the backend environment.";
  } else if (!credentialReady) {
    blockingReason =
      source.credentialNote ??
      "This source has not been verified in the backend environment yet.";
  }

  return {
    sourceKey,
    displayName: source.displayName,
    launchMode,
    isKnown: true,
    isRunnable,
    blockingReason,
    note: source.notes ?? source.credentialNote ?? null,
  };
}

export function getSuggestedRunnableSources(sources: SourceOverview[], limit = 4) {
  return sources
    .filter(
      (source) =>
        isLaunchableSource(source) &&
        resolveSourceRuntime(source.siteKey, new Map([[source.siteKey, source]])).isRunnable,
    )
    .sort((left, right) => {
      const leftSupport = left.supportTier === "live_supported" ? 0 : 1;
      const rightSupport = right.supportTier === "live_supported" ? 0 : 1;
      if (leftSupport !== rightSupport) return leftSupport - rightSupport;
      if (left.workingStatus === "working" && right.workingStatus !== "working") return -1;
      if (left.workingStatus !== "working" && right.workingStatus === "working") return 1;
      return left.displayName.localeCompare(right.displayName);
    })
    .slice(0, limit);
}
