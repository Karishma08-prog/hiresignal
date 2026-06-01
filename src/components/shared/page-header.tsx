import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--brand-blue)]">
          HireSignal
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-black">
          {title}
        </h1>
        <p className="max-w-3xl text-sm leading-7 text-[rgba(15,15,15,0.74)]">
          {description}
        </p>
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
