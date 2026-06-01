import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";

export default function Home() {
  const workspaceLinks = [
    { href: "/scraper", label: "Open Scraper" },
    { href: "/dashboard", label: "View Dashboard" },
    { href: "/campaigns", label: "View Campaigns" },
    { href: "/companies", label: "View Companies" },
    { href: "/job-boards", label: "View Job Boards" },
    { href: "/reports", label: "View Reports" },
    { href: "/settings", label: "View Settings" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="HireSignal Frontend"
        description="The frontend is now wired into the backend workflow for campaigns, runs, companies, reports, and source diagnostics."
      />
      <section className="rounded-[2rem] border border-white/70 bg-white/85 p-8 shadow-[0_20px_60px_rgba(37,99,235,0.18)] backdrop-blur">
        <div className="max-w-3xl space-y-4">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-[var(--brand-blue)]">
            Live Workflow
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-black">
            Create campaigns, track runs, inspect companies, monitor source
            health, and export reports from one flow.
          </h2>
          <p className="text-base leading-7 text-black/70">
            Start in the Scraper view to launch a campaign, then use Dashboard,
            Campaigns, Companies, Job Boards, and Reports to review the result.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            {workspaceLinks.map((link, index) => (
              <Link
                key={link.href}
                href={link.href}
                className={
                  index === 0
                    ? "rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                    : "rounded-full border border-blue-200 px-5 py-3 text-sm font-semibold text-black/80 transition hover:border-black hover:text-black"
                }
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

