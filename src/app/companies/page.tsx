"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Building2, Globe2, ScanSearch, Search } from "lucide-react";
import { getCompaniesPage } from "@/lib/api/companies";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { MetricCard } from "@/components/shared/metric-card";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { PageHeader } from "@/components/shared/page-header";

export default function CompaniesPage() {
  const [search, setSearch] = useState("");
  const [fitFilter, setFitFilter] = useState("all");
  const [sortBy, setSortBy] = useState("freshest");
  const [page, setPage] = useState(1);
  const deferredSearch = useDeferredValue(search);
  const pageSize = 20;

  const companiesQuery = useQuery({
    queryKey: ["companies", page, deferredSearch, fitFilter],
    queryFn: () =>
      getCompaniesPage({
        page,
        pageSize,
        search: deferredSearch.trim() || undefined,
        fit: fitFilter === "all" ? undefined : fitFilter,
      }),
  });

  const companies = useMemo(() => companiesQuery.data?.items ?? [], [companiesQuery.data?.items]);
  const totalCompanies = companiesQuery.data?.total ?? 0;

  const sortedCompanies = useMemo(() => {
    return [...companies].sort((left, right) => {
      if (sortBy === "company") {
        return left.name.localeCompare(right.name);
      }
      if (sortBy === "fit") {
        const rank: Record<string, number> = { high: 3, medium: 2, low: 1 };
        return (rank[right.revEngineerFit.toLowerCase()] ?? 0) - (rank[left.revEngineerFit.toLowerCase()] ?? 0);
      }
      return right.daysActive - left.daysActive;
    });
  }, [companies, sortBy]);

  const totalPages = Math.max(1, Math.ceil(totalCompanies / pageSize));
  const currentPage = Math.min(page, totalPages);
  const rows = sortedCompanies.map((company) => ({
    id: company.id,
    name: company.name,
    fit: company.revEngineerFit,
    website: company.website ?? company.domain ?? "No website",
    description:
      company.description?.slice(0, 140)
      ?? company.webEvidence?.slice(0, 140)
      ?? "No description captured yet.",
    objectiveSignal: company.objectiveSignal?.slice(0, 120) ?? "No signal extracted from source row yet.",
    titleMatch: company.titleMatch ?? "No title match yet.",
    location: company.location ?? "Unknown",
    daysActive: company.daysActive >= 0 ? `${company.daysActive} days` : "Unknown",
  }));

  if (companiesQuery.isError) {
    return (
      <EmptyState
        title="Companies could not be loaded"
        description="The Company page depends on the backend company aggregation endpoint. Start the backend and run at least one campaign import."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Companies"
        description="Companies are your lead list. This page now stays lighter by loading one backend page at a time while keeping the strongest signal fields visible."
      />

      {companiesQuery.isLoading && companies.length === 0 ? (
        <LoadingState label="Loading companies from the backend..." />
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Target companies"
          value={String(totalCompanies)}
          change="Paged from backend company results"
          icon={Building2}
        />
        <MetricCard
          label="High RevEngineer fit"
          value={String(
            companies.filter((company) => company.revEngineerFit.toLowerCase() === "high").length,
          )}
          change="Best outreach candidates on this page"
          icon={ScanSearch}
        />
        <MetricCard
          label="Web evidence checked"
          value={`${companies.filter((company) => company.webEvidence).length}/${companies.length}`}
          change="Evidence snippets in the current page slice"
          icon={Globe2}
        />
      </section>

      <section className="rounded-[1.8rem] border border-blue-100 bg-white p-5 shadow-[0_12px_28px_rgba(15,15,15,0.05)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-black/60">
              Lead Search
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-black">
              Search by company and fit
            </h2>
          </div>
          <div className="grid w-full gap-3 md:max-w-4xl md:grid-cols-4">
            <label className="flex items-center gap-3 rounded-full border border-blue-100 bg-blue-50 px-4 py-3 md:col-span-2">
              <Search className="h-4 w-4 text-black/45" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search leads..."
                className="w-full bg-transparent text-sm text-black outline-none placeholder:text-black/45"
              />
            </label>
            <select
              value={fitFilter}
              onChange={(event) => {
                setFitFilter(event.target.value);
                setPage(1);
              }}
              className="rounded-full border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-black outline-none"
            >
              <option value="all">All fits</option>
              <option value="high">High fit</option>
              <option value="medium">Medium fit</option>
              <option value="low">Low fit</option>
            </select>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="rounded-full border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-black outline-none"
            >
              <option value="freshest">Sort: Freshest</option>
              <option value="fit">Sort: Best fit</option>
              <option value="company">Sort: Company A-Z</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <p className="self-center text-sm text-black/60">
            {totalCompanies} matching lead{totalCompanies === 1 ? "" : "s"}
          </p>
        </div>
      </section>

      {totalCompanies === 0 && !companiesQuery.isLoading ? (
        <EmptyState
          title={companies.length === 0 ? "No companies have been aggregated yet" : "No leads match this search"}
          description={
            companies.length === 0
              ? "Run a campaign first so the backend can import jobs and group them into target companies."
              : "Try a company name or fit filter to narrow the list."
          }
        />
      ) : (
        <section className="rounded-[1.8rem] border border-blue-100 bg-white p-6 shadow-[0_12px_28px_rgba(15,15,15,0.05)]">
          <div className="mb-5 flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-black">
              Company Signals
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-black">
              Lead signals from website, objective, title, location, and freshness
            </h2>
            <p className="max-w-4xl text-sm leading-7 text-black/70">
              This shortlist is streamed from the backend one page at a time so it stays responsive
              as the dataset grows.
            </p>
          </div>

          <DataTable
            columns={[
              {
                key: "name",
                header: "Company",
                render: (row) => (
                  <div className="space-y-1">
                    <Link
                      href={`/companies/${row.id}`}
                      className="font-semibold text-black transition hover:text-[var(--brand-blue)]"
                    >
                      {row.name}
                    </Link>
                    <p className="text-xs uppercase tracking-[0.18em] text-black/60">
                      {row.website}
                    </p>
                  </div>
                ),
              },
              { key: "fit", header: "Fit" },
              { key: "description", header: "Description" },
              { key: "objectiveSignal", header: "Objective" },
              { key: "titleMatch", header: "Title" },
              { key: "location", header: "Location" },
              { key: "daysActive", header: "Days" },
            ]}
            rows={rows}
            emptyMessage="No companies match the current search and filters."
          />
          <PaginationControls
            page={currentPage}
            totalPages={totalPages}
            totalItems={totalCompanies}
            pageSize={pageSize}
            itemLabel="leads"
            onPrevious={() => setPage((current) => Math.max(1, current - 1))}
            onNext={() => setPage((current) => Math.min(totalPages, current + 1))}
          />
        </section>
      )}
    </div>
  );
}
