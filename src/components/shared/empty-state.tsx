import type { LucideIcon } from "lucide-react";

export function EmptyState({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-blue-200 bg-white/70 p-10 text-center">
      {Icon ? (
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-[var(--brand-blue)]">
          <Icon className="h-6 w-6" />
        </div>
      ) : null}
      <h3 className="text-xl font-semibold tracking-tight text-black">
        {title}
      </h3>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-black/70">
        {description}
      </p>
    </div>
  );
}

