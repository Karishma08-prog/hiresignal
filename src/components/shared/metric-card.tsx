import type { LucideIcon } from "lucide-react";

export function MetricCard({
  label,
  value,
  change,
  icon: Icon,
}: {
  label: string;
  value: string;
  change: string;
  icon?: LucideIcon;
}) {
  return (
    <article className="rounded-[1.75rem] border border-[rgba(37,99,235,0.2)] bg-white p-5 shadow-[0_16px_40px_rgba(37,99,235,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-[rgba(15,15,15,0.72)]">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-black">
            {value}
          </p>
        </div>
        {Icon ? (
          <div className="rounded-2xl bg-[rgba(37,99,235,0.12)] p-3 text-[var(--brand-blue)]">
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
      </div>
      <p className="mt-5 text-sm font-medium text-[var(--brand-blue)]">{change}</p>
    </article>
  );
}
