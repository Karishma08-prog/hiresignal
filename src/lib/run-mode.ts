import type { CampaignRun, RunLog } from "@/lib/types/campaign";

const ACTIVE_RUN_STATUSES = new Set(["queued", "running"]);

export function isActiveRunStatus(status?: string | null) {
  return status ? ACTIVE_RUN_STATUSES.has(status.toLowerCase()) : false;
}

export function deriveRunMode(
  run: Pick<CampaignRun, "runMode" | "runNotes" | "status">,
  logs: RunLog[] = [],
) {
  if (run.runMode) {
    return run.runMode;
  }

  const notes = (run.runNotes ?? "").toLowerCase();
  if (notes.includes("[fresh_live]") || notes.includes("fresh live scraper outputs")) {
    return "fresh_live";
  }
  if (notes.includes("[historical_import]") || notes.startsWith("imported ")) {
    return "historical_import";
  }
  if (
    notes.includes("[demo_fallback]") ||
    notes.includes("demo fallback") ||
    notes.includes("placeholder")
  ) {
    return "demo_fallback";
  }
  if (notes.includes("[live_attempt_failed]")) {
    return "live_attempt_failed";
  }

  if (logs.some((log) => log.message === "No output files found; using demo fallback.")) {
    return "demo_fallback";
  }

  const discoveredLog = logs.find((log) => log.message === "Discovered output files for ingestion.");
  if (discoveredLog) {
    return discoveredLog.details.freshRunOutputs ? "fresh_live" : "historical_import";
  }

  if (
    logs.some(
      (log) =>
        log.message.includes("Skipped ATS discovery") ||
        log.message.includes("No fresh output files were produced for this live run."),
    )
  ) {
    return "live_attempt_failed";
  }

  if (run.status === "failed") {
    return "live_attempt_failed";
  }

  return "unknown";
}
