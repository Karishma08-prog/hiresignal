"use client";

type TitleFilterProps = {
  titleGroups: string[];
  selectedTitles: string[];
  includeKeywords: string[];
  onToggleTitle: (title: string) => void;
  onSelectAllTitles: () => void;
  onClearTitles: () => void;
  onKeywordsChange: (keywords: string[]) => void;
};

export function TitleFilter({
  titleGroups,
  selectedTitles,
  includeKeywords,
  onToggleTitle,
  onSelectAllTitles,
  onClearTitles,
  onKeywordsChange,
}: TitleFilterProps) {
  const allSelected = selectedTitles.length === titleGroups.length;

  return (
    <section className="rounded-[1.9rem] border border-white/70 bg-white/90 p-6 shadow-[0_18px_48px_rgba(37,99,235,0.16)]">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--brand-blue)]">
          Title Filter
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-black">
          Refine by role naming
        </h2>
        <p className="mt-2 text-sm leading-7 text-black/70">
          Keep related titles grouped together so the scraper stays focused on
          equivalent roles across job boards.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-black/60">
          {selectedTitles.length} selected
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onSelectAllTitles}
            disabled={allSelected}
            className="rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs font-semibold text-black transition hover:border-black disabled:cursor-not-allowed disabled:opacity-45"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={onClearTitles}
            disabled={selectedTitles.length === 0}
            className="rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs font-semibold text-black transition hover:border-black disabled:cursor-not-allowed disabled:opacity-45"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {titleGroups.map((title) => (
          <button
            type="button"
            key={title}
            onClick={() => onToggleTitle(title)}
            aria-pressed={selectedTitles.includes(title)}
            className={[
              "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition",
              selectedTitles.includes(title)
                ? "border-[var(--brand-blue)] bg-blue-50 text-black shadow-[0_8px_20px_rgba(37,99,235,0.12)]"
                : "border-blue-100 bg-white text-black/80 hover:border-black",
            ].join(" ")}
          >
            <span>{title}</span>
            <span
              className={[
                "inline-flex min-w-16 justify-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]",
                selectedTitles.includes(title)
                  ? "bg-[var(--brand-blue)] text-white"
                  : "border border-blue-100 bg-white text-black/60",
              ].join(" ")}
            >
              {selectedTitles.includes(title) ? "On" : "Off"}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-5 rounded-[1.5rem] subtle-grid border border-blue-100 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-black/60">
          Include Keywords
        </p>
        <textarea
          value={includeKeywords.join(", ")}
          onChange={(event) =>
            onKeywordsChange(
              event.target.value
                .split(",")
                .map((value) => value.trim())
                .filter(Boolean),
            )
          }
          rows={4}
          className="mt-3 w-full rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-7 text-black/80 outline-none transition focus:border-[var(--brand-blue)] focus:bg-white"
        />
      </div>
    </section>
  );
}

