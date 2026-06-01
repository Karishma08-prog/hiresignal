"use client";

import { Bell, Search, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";

const labels: Record<string, string> = {
  "/": "Home",
  "/dashboard": "Dashboard",
  "/scraper": "Scraper",
  "/campaigns": "Campaigns",
  "/companies": "Companies",
  "/campaign-runs": "Run Detail",
  "/job-boards": "Job Boards",
  "/reports": "Reports",
  "/settings": "Settings",
};

function getSectionLabel(pathname: string) {
  const matched = Object.keys(labels)
    .sort((a, b) => b.length - a.length)
    .find((key) => key !== "/" && pathname.startsWith(key));

  return matched ? labels[matched] : labels[pathname] ?? "Workspace";
}

export function AppHeader() {
  const pathname = usePathname();
  const sectionLabel = getSectionLabel(pathname);

  return (
    <header className="sticky top-0 z-20 border-b border-blue-100 bg-white">
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-black">
            Overview
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-black">
            {sectionLabel}
          </h2>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex min-w-[260px] items-center gap-3 rounded-full border border-blue-100 bg-white px-4 py-3 text-sm text-black/60">
            <Search className="h-4 w-4" />
            <span>Search campaigns, companies, reports...</span>
          </div>
          <button className="flex items-center justify-center rounded-full border border-blue-100 bg-white p-3 text-black/60 transition hover:border-black hover:text-black">
            <Bell className="h-4 w-4" />
          </button>
          <button className="flex items-center gap-2 rounded-full bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">
            <Sparkles className="h-4 w-4" />
            New Insight
          </button>
        </div>
      </div>
    </header>
  );
}

