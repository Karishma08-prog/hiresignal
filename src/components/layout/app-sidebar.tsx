"use client";

import { BarChart3, BriefcaseBusiness, Building2, LayoutDashboard, Radar, Settings, Target } from "lucide-react";
import { usePathname } from "next/navigation";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/scraper", label: "Scraper", icon: Radar },
  { href: "/campaigns", label: "Campaigns", icon: Target },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/job-boards", label: "Job Boards", icon: BriefcaseBusiness },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <>
      <div className="border-b border-blue-100 bg-white/95 px-4 py-4 text-black lg:hidden">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-black">
          HireSignal
        </p>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {navigation.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);

            return (
              <a
                key={href}
                href={href}
                className={[
                  "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition",
                  active
                    ? "bg-black text-white"
                    : "border border-blue-100 bg-white text-black/70",
                ].join(" ")}
              >
                {label}
              </a>
            );
          })}
        </div>
      </div>

      <aside className="hidden w-72 shrink-0 border-r border-blue-100 bg-white px-5 py-6 text-black lg:flex lg:flex-col">
        <div className="rounded-[1.75rem] border border-[var(--brand-blue)] bg-[var(--brand-blue)] p-5 shadow-[0_16px_40px_rgba(37,99,235,0.2)]">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/80">
            Engine
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">
            HireSignal
          </h1>
          <p className="mt-2 text-sm font-medium leading-6 text-white/85">
            Compliance-first operator console
          </p>
        </div>

        <div className="mt-7 border-t border-blue-100 pt-5">
          <p className="px-3 text-xs font-semibold uppercase tracking-[0.28em] text-black">
            Workspace
          </p>
        </div>

        <nav className="mt-3 flex flex-1 flex-col gap-2">
          {navigation.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);

            return (
              <a
                key={href}
                href={href}
                className={[
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                  active
                    ? "bg-black text-white shadow-[0_14px_30px_rgba(15,23,42,0.18)]"
                    : "text-black/70 hover:bg-blue-50 hover:text-black",
                ].join(" ")}
              >
                <Icon className={active ? "h-4 w-4 text-white" : "h-4 w-4 text-black/45"} />
                <span>{label}</span>
              </a>
            );
          })}
        </nav>

        <div className="rounded-[1.5rem] border border-blue-100 bg-white p-4 text-sm text-black/70 shadow-[0_12px_24px_rgba(15,15,15,0.04)]">
          <p className="font-semibold text-black">Today&apos;s focus</p>
          <p className="mt-2 leading-6">
            Finish the Scraper screen, then move into Campaigns and Companies
            with the same shared patterns.
          </p>
        </div>
      </aside>
    </>
  );
}

