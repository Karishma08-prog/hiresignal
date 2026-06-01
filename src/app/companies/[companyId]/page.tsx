"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Globe, SearchCheck, Target } from "lucide-react";
import { getCompanyById } from "@/lib/api/companies";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { MetricCard } from "@/components/shared/metric-card";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";

export default function CompanyDetailPage() {
  const params = useParams<{ companyId: string }>();
  const companyId = params.companyId;
  const companyQuery = useQuery({
    queryKey: ["company", companyId],
    queryFn: () => getCompanyById(companyId),
    enabled: Boolean(companyId),
  });

  if (companyQuery.isLoading) {
    return <LoadingState label="Loading company detail..." />;
  }

  if (companyQuery.isError || !companyQuery.data) {
    return (
      <EmptyState
        title="Company could not be loaded"
        description="This detail page now reads the backend company detail endpoint. Make sure the selected company exists in the latest imported run."
      />
    );
  }

  const company = companyQuery.data.company;
  const relatedJobs = companyQuery.data.jobs.map((job) => ({
    id: job.id,
    title: job.title,
    source: job.site,
    status: job.matchedObjective ? "matched" : "tracked",
    postedAt: job.datePosted ?? "Unknown",
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={company.name}
        description={`${company.industry ?? "Target account"} in ${company.location ?? "Unknown location"}. This page now reads real backend evidence and matched jobs.`}
        action={
          company.website ? (
            <Link
              href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Visit Website
            </Link>
          ) : null
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="RevEngineer Fit"
          value={company.revEngineerFit}
          change={`${company.priority} outreach priority`}
        />
        <MetricCard
          label="Open roles"
          value={String(company.openRoles)}
          change={company.source ?? "Backend source aggregation"}
        />
        <MetricCard
          label="Freshness window"
          value={`${company.daysActive}d`}
          change="Within active review period"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[1.8rem] border border-blue-100 bg-white p-6 shadow-[0_12px_28px_rgba(15,15,15,0.05)]">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-blue-50 p-3 text-[var(--brand-blue)]">
              <Target className="h-5 w-5" />
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-black/60">
                  Objective Match
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-black">
                  {company.objectiveSignal ?? "No objective signal yet."}
                </h2>
              </div>
              <p className="text-sm leading-7 text-black/70">
                {company.description ?? "No company description was captured yet."}
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[1.3rem] border border-blue-100 bg-blue-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-black/60">
                    Website
                  </p>
                  <p className="mt-2 text-sm font-medium text-black">
                    {company.website ?? company.domain ?? "Unknown"}
                  </p>
                </div>
                <div className="rounded-[1.3rem] border border-blue-100 bg-blue-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-black/60">
                    Matched Title
                  </p>
                  <p className="mt-2 text-sm font-medium text-black">
                    {company.titleMatch ?? "No title match yet."}
                  </p>
                </div>
                <div className="rounded-[1.3rem] border border-blue-100 bg-blue-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-black/60">
                    Source
                  </p>
                  <p className="mt-2 text-sm font-medium text-black">
                    {company.source ?? "Backend aggregation"}
                  </p>
                </div>
                <div className="rounded-[1.3rem] border border-blue-100 bg-blue-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-black/60">
                    Status
                  </p>
                  <div className="mt-2">
                    <StatusBadge status={company.status} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>

        <div className="space-y-5">
          <article className="rounded-[1.8rem] border border-blue-100 bg-white p-6 shadow-[0_12px_28px_rgba(15,15,15,0.05)]">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-blue-50 p-3 text-[var(--brand-blue)]">
                <SearchCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-black/60">
                  Web Evidence
                </p>
                <p className="mt-3 text-sm leading-7 text-black/70">
                  {company.webEvidence ?? companyQuery.data.signals?.evidenceSnippet ?? "No evidence snippet yet."}
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-[1.8rem] border border-blue-100 bg-white p-6 shadow-[0_12px_28px_rgba(15,15,15,0.05)]">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-blue-50 p-3 text-[var(--brand-blue)]">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-black/60">
                  Matched Signals
                </p>
                <p className="mt-3 text-sm leading-7 text-black/70">
                  {companyQuery.data.signals?.matchedSignals?.join(", ") || "No matched signals yet."}
                </p>
              </div>
            </div>
          </article>
        </div>
      </section>

      <article className="rounded-[1.8rem] border border-blue-100 bg-white p-6 shadow-[0_12px_28px_rgba(15,15,15,0.05)]">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-black">
            Matching Roles
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-black">
            Roles that triggered this company entry
          </h2>
          <p className="mt-2 text-sm leading-7 text-black/70">
            These are the real backend job rows linked to this company.
          </p>
        </div>

        <DataTable
          columns={[
            { key: "title", header: "Role" },
            { key: "source", header: "Source" },
            {
              key: "status",
              header: "Status",
              render: (row) => <StatusBadge status={String(row.status)} />,
            },
            { key: "postedAt", header: "Posted" },
          ]}
          rows={relatedJobs}
        />
      </article>
    </div>
  );
}
