type HistoryPoint = {
  label: string;
  value: number;
  secondaryValue?: number;
  href?: string;
};

export function HistoryBarChart({
  title,
  subtitle,
  points,
}: {
  title: string;
  subtitle: string;
  points: HistoryPoint[];
}) {
  const maxValue = Math.max(...points.map((point) => point.value), 1);

  return (
    <section className="rounded-[1.8rem] border border-[rgba(37,99,235,0.2)] bg-white p-6 shadow-[0_12px_28px_rgba(37,99,235,0.08)]">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--brand-blue)]">{title}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-black">{subtitle}</h2>
      <div className="mt-6 space-y-4">
        {points.map((point) => (
          <div key={`${point.label}-${point.href ?? "row"}`} className="space-y-2">
            <div className="flex items-center justify-between gap-4 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium text-black">{point.label}</p>
                {typeof point.secondaryValue === "number" ? (
                  <p className="text-xs text-[rgba(15,15,15,0.64)]">{point.secondaryValue} companies</p>
                ) : null}
              </div>
              <p className="text-sm font-semibold text-black">{point.value}</p>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-[rgba(37,99,235,0.12)]">
              <div
                className="h-full rounded-full bg-[var(--brand-blue)]"
                style={{ width: `${Math.max((point.value / maxValue) * 100, point.value > 0 ? 8 : 0)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
