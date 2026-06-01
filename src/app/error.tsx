"use client";

import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="rounded-[1.75rem] border border-blue-100 bg-white p-8 shadow-[0_16px_40px_rgba(37,99,235,0.12)]">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-black/60">
        HireSignal
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-black">
        Something interrupted this workspace
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-black/70">
        The page hit an unexpected error while loading live lead data. Retry once, and if it keeps
        failing we can trace the exact route or backend response behind it.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-full bg-[var(--brand-blue)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
      >
        Retry page
      </button>
    </div>
  );
}

