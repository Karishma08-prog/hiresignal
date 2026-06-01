"use client";

type ObjectiveMode = {
  key: string;
  title: string;
  description: string;
};

type ObjectiveFilterProps = {
  objectiveModes: ObjectiveMode[];
  selectedMode: string;
  objectiveText: string;
  targetMarket: string;
  signals: string[];
  selectedSignals: string[];
  onModeChange: (mode: string) => void;
  onObjectiveTextChange: (value: string) => void;
  onTargetMarketChange: (value: string) => void;
  onToggleSignal: (signal: string) => void;
  onSelectAllSignals: () => void;
  onClearSignals: () => void;
};

export function ObjectiveFilter({
  objectiveModes,
  selectedMode,
  objectiveText,
  targetMarket,
  signals,
  selectedSignals,
  onModeChange,
  onObjectiveTextChange,
  onTargetMarketChange,
  onToggleSignal,
  onSelectAllSignals,
  onClearSignals,
}: ObjectiveFilterProps) {
  const allSignalsSelected = selectedSignals.length === signals.length;

  return (
    <section className="rounded-[1.9rem] border border-white/70 bg-white/90 p-6 shadow-[0_18px_48px_rgba(37,99,235,0.16)]">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--brand-blue)]">
          Objective Filter
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-black">
          Decide what signals matter
        </h2>
        <p className="mt-2 text-sm leading-7 text-black/70">
          Set the intent before scraping so you can sort results by useful
          business context instead of raw job count.
        </p>
      </div>

      <div className="space-y-3">
        {objectiveModes.map((objective) => (
          <button
            type="button"
            key={objective.key}
            onClick={() => onModeChange(objective.key)}
            aria-pressed={selectedMode === objective.key}
            className={[
              "flex w-full gap-4 rounded-[1.5rem] border p-4 text-left transition",
              selectedMode === objective.key
                ? "border-[var(--brand-blue)] bg-blue-50 shadow-[0_8px_20px_rgba(37,99,235,0.12)]"
                : "border-blue-100 bg-white hover:border-black",
            ].join(" ")}
          >
            <span
              className={[
                "mt-0.5 inline-flex h-6 min-w-16 items-center justify-center rounded-full px-3 text-xs font-semibold uppercase tracking-[0.2em]",
                selectedMode === objective.key
                  ? "bg-[var(--brand-blue)] text-white"
                  : "border border-blue-100 bg-white text-black/60",
              ].join(" ")}
            >
              {selectedMode === objective.key ? "Active" : "Mode"}
            </span>
            <span>
              <p className="text-sm font-semibold text-black">
                {objective.title}
              </p>
              <p className="mt-1 text-sm leading-7 text-black/70">
                {objective.description}
              </p>
            </span>
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-4 rounded-[1.5rem] border border-blue-100 bg-white p-4">
        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-black/60">
            Objective Statement
          </span>
          <textarea
            value={objectiveText}
            onChange={(event) => onObjectiveTextChange(event.target.value)}
            rows={3}
            className="w-full rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-7 text-black/80 outline-none transition focus:border-[var(--brand-blue)] focus:bg-white"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-black/60">
            Target Market
          </span>
          <input
            value={targetMarket}
            onChange={(event) => onTargetMarketChange(event.target.value)}
            className="w-full rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-black/80 outline-none transition focus:border-[var(--brand-blue)] focus:bg-white"
          />
        </label>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-black/60">
              Signal Keywords
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onSelectAllSignals}
                disabled={allSignalsSelected}
                className="rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs font-semibold text-black transition hover:border-black disabled:cursor-not-allowed disabled:opacity-45"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={onClearSignals}
                disabled={selectedSignals.length === 0}
                className="rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs font-semibold text-black transition hover:border-black disabled:cursor-not-allowed disabled:opacity-45"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {signals.map((signal) => (
              <button
                type="button"
                key={signal}
                onClick={() => onToggleSignal(signal)}
                aria-pressed={selectedSignals.includes(signal)}
                className={[
                  "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition",
                  selectedSignals.includes(signal)
                    ? "border-[var(--brand-blue)] bg-blue-50 text-black shadow-[0_8px_20px_rgba(37,99,235,0.12)]"
                    : "border-blue-100 bg-white text-black/80 hover:border-black",
                ].join(" ")}
              >
                <span>{signal}</span>
                <span
                  className={[
                    "inline-flex min-w-16 justify-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]",
                    selectedSignals.includes(signal)
                      ? "bg-[var(--brand-blue)] text-white"
                      : "border border-blue-100 bg-white text-black/60",
                  ].join(" ")}
                >
                  {selectedSignals.includes(signal) ? "On" : "Off"}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[1.25rem] bg-black p-4 text-sm leading-7 text-white">
          Current scoring focus: objective text, target market, and the selected evidence signals
          will now be saved directly into the campaign run.
        </div>
      </div>
    </section>
  );
}

