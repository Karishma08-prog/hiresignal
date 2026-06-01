export function LoadingState({ label = "Loading content..." }: { label?: string }) {
  return (
    <div className="rounded-[1.75rem] border border-white/70 bg-white/80 p-6 shadow-[0_16px_40px_rgba(37,99,235,0.12)]">
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-32 rounded-full bg-blue-100" />
        <div className="h-10 w-full rounded-2xl bg-blue-100" />
        <div className="h-10 w-5/6 rounded-2xl bg-blue-50" />
        <div className="h-10 w-2/3 rounded-2xl bg-blue-50" />
      </div>
      <p className="mt-5 text-sm text-black/60">{label}</p>
    </div>
  );
}

