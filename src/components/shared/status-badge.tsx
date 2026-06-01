const statusStyles: Record<string, string> = {
  active: "bg-[var(--brand-blue)] text-white",
  live: "bg-[var(--brand-blue)] text-white",
  running: "bg-[rgba(37,99,235,0.14)] text-[var(--brand-blue)]",
  ready: "bg-[rgba(37,99,235,0.14)] text-[var(--brand-blue)]",
  configured: "bg-[rgba(37,99,235,0.14)] text-[var(--brand-blue)]",
  verified: "bg-[var(--brand-blue)] text-white",
  live_supported: "bg-[var(--brand-blue)] text-white",
  fallback_supported: "bg-[rgba(37,99,235,0.14)] text-[var(--brand-blue)]",
  experimental: "border border-black bg-white text-black",
  disabled: "bg-black text-white",
  degraded: "bg-black text-white",
  needs_setup: "border border-[var(--brand-blue)] bg-white text-[var(--brand-blue)]",
  working: "bg-[var(--brand-blue)] text-white",
  draft: "border border-black bg-white text-black",
  queued: "border border-[var(--brand-blue)] bg-white text-[var(--brand-blue)]",
  matched: "bg-[var(--brand-blue)] text-white",
  tracked: "border border-black bg-white text-black",
  paused: "border border-black bg-white text-black",
  archived: "border border-black bg-white text-black",
  failed: "bg-black text-white",
  error: "bg-black text-white",
  warning: "border border-black bg-white text-black",
  info: "bg-[rgba(37,99,235,0.14)] text-[var(--brand-blue)]",
  failing_or_unreliable: "bg-black text-white",
  working_for_use_case: "bg-[var(--brand-blue)] text-white",
  working_but_not_for_current_query: "border border-[var(--brand-blue)] bg-white text-[var(--brand-blue)]",
  working_via_existing_results: "bg-[rgba(37,99,235,0.14)] text-[var(--brand-blue)]",
  fresh_live: "bg-[var(--brand-blue)] text-white",
  historical_import: "bg-[rgba(37,99,235,0.14)] text-[var(--brand-blue)]",
  live_attempt_failed: "bg-black text-white",
  demo_fallback: "border border-black bg-white text-black",
  unknown: "border border-black bg-white text-black",
};

export function StatusBadge({ status }: { status: string }) {
  const style = statusStyles[status.toLowerCase()] ?? "border border-black bg-white text-black";
  const label = status.replace(/_/g, " ");

  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize",
        style,
      ].join(" ")}
    >
      {label}
    </span>
  );
}
