"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { KeyRound, ShieldAlert, Settings2, Waypoints } from "lucide-react";
import { getSourceCredentials, getSourceOverview } from "@/lib/api/sources";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingState } from "@/components/shared/loading-state";
import { MetricCard } from "@/components/shared/metric-card";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";

export default function SettingsPage() {
  const credentialsQuery = useQuery({
    queryKey: ["source-credentials"],
    queryFn: getSourceCredentials,
  });
  const overviewQuery = useQuery({
    queryKey: ["source-overview"],
    queryFn: getSourceOverview,
  });

  const overviewMap = useMemo(() => {
    return new Map((overviewQuery.data ?? []).map((source) => [source.siteKey, source] as const));
  }, [overviewQuery.data]);

  if (credentialsQuery.isLoading || overviewQuery.isLoading) {
    return <LoadingState label="Loading source credentials and settings state..." />;
  }

  if (credentialsQuery.isError || overviewQuery.isError) {
    return (
      <EmptyState
        title="Settings could not be loaded"
        description="This page now reads the backend credential registry and source overview. Start the backend and verify /api/sources/credentials and /api/sources/overview."
        icon={Settings2}
      />
    );
  }

  const credentials = credentialsQuery.data ?? [];
  const missingCredentials = credentials.filter(
    (credential) => (credential.needsApiKey || credential.needsProxy) && !credential.credentialPresent,
  );
  const proxyDependent = credentials.filter((credential) => credential.needsProxy).length;
  const slugDependent = credentials.filter((credential) => credential.needsCompanySlug).length;

  const rows = credentials.map((credential) => {
    const source = overviewMap.get(credential.siteKey);
    return {
      id: credential.siteKey,
      source: source?.displayName ?? credential.siteKey,
      apiKey: credential.needsApiKey ? "Required" : "No",
      proxy: credential.needsProxy ? "Required" : "No",
      slug: credential.needsCompanySlug ? "Required" : "No",
      present: credential.credentialPresent ? "Present" : "Missing",
      verifiedAt: credential.credentialVerifiedAt
        ? credential.credentialVerifiedAt.slice(0, 10)
        : "Not verified",
      workingStatus: credential.workingStatus,
      note:
        credential.credentialNote ??
        source?.lastErrorMessage ??
        source?.notes ??
        "No credential note recorded.",
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="This page now reflects the backend source credential registry so you can see which boards need keys, proxies, or company slug discovery."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Credential rows"
          value={String(credentials.length)}
          change="Source registry tracked in backend"
          icon={KeyRound}
        />
        <MetricCard
          label="Proxy-dependent boards"
          value={String(proxyDependent)}
          change="Driven by credential registry"
          icon={Waypoints}
        />
        <MetricCard
          label="Needs attention"
          value={String(missingCredentials.length)}
          change="Missing keys or proxy configuration"
          icon={ShieldAlert}
        />
        <MetricCard
          label="Slug-dependent ATS"
          value={String(slugDependent)}
          change="Needs company slug discovery"
          icon={Settings2}
        />
      </section>

      {rows.length === 0 ? (
        <EmptyState
          title="No source credentials registered yet"
          description="Seed the backend or import a run first so source credentials and health rows can be created."
          icon={Settings2}
        />
      ) : (
        <>
          <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[1.8rem] border border-blue-100 bg-white p-6 shadow-[0_12px_28px_rgba(15,15,15,0.05)]">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-black/60">
                Credential Registry
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-black">
                Source requirements and verification
              </h2>
              <p className="mt-3 max-w-4xl text-sm leading-7 text-black/70">
                These rows come from the backend credential registry and help separate
                &nbsp;&quot;board is configured&quot;&nbsp;from&nbsp;&quot;board is actually
                healthy.&quot;
              </p>

              <div className="mt-5">
                <DataTable
                  columns={[
                    { key: "source", header: "Source" },
                    { key: "apiKey", header: "API Key" },
                    { key: "proxy", header: "Proxy" },
                    { key: "slug", header: "Slug" },
                    { key: "present", header: "Present" },
                    { key: "verifiedAt", header: "Verified" },
                    {
                      key: "workingStatus",
                      header: "Working Status",
                      render: (row) => <StatusBadge status={String(row.workingStatus)} />,
                    },
                  ]}
                  rows={rows}
                />
              </div>
            </div>

            <div className="space-y-5">
              <article className="rounded-[1.8rem] border border-blue-100 bg-white p-6 shadow-[0_12px_28px_rgba(15,15,15,0.05)]">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-black/60">
                  Environment Keys
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-black">
                  Current backend inputs
                </h2>
                <div className="mt-4 space-y-3 text-sm text-black/70">
                  <div className="rounded-[1.1rem] border border-blue-100 bg-blue-50 p-3">
                    <p className="font-semibold text-black">`SCRAPPA_TOKEN`</p>
                    <p className="mt-1">Needed for ATS discovery from `scrappa_ats.mjs`.</p>
                  </div>
                  <div className="rounded-[1.1rem] border border-blue-100 bg-blue-50 p-3">
                    <p className="font-semibold text-black">`JOBS_PROXY`</p>
                    <p className="mt-1">Primary proxy value for `ever-jobs` style script calls.</p>
                  </div>
                  <div className="rounded-[1.1rem] border border-blue-100 bg-blue-50 p-3">
                    <p className="font-semibold text-black">`JOBS_BOTA_PROXY`</p>
                    <p className="mt-1">Optional proxy path for Botasaurus browser runs.</p>
                  </div>
                  <div className="rounded-[1.1rem] border border-blue-100 bg-blue-50 p-3">
                    <p className="font-semibold text-black">`HIRESIGNAL_ENABLE_SCRIPT_EXECUTION`</p>
                    <p className="mt-1">Turns on real script execution before ingestion.</p>
                  </div>
                </div>
              </article>

              <article className="rounded-[1.8rem] border border-blue-100 bg-white p-6 shadow-[0_12px_28px_rgba(15,15,15,0.05)]">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-black/60">
                  Operational Notes
                </p>
                <div className="mt-4 space-y-3">
                  {rows.slice(0, 5).map((row) => (
                    <div
                      key={row.id}
                      className="rounded-[1.1rem] border border-blue-100 bg-blue-50 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-black">{row.source}</p>
                        <StatusBadge status={String(row.workingStatus)} />
                      </div>
                      <p className="mt-2 text-sm text-black/70">{row.note}</p>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </section>

          <section className="rounded-[1.8rem] border border-blue-100 bg-white p-6 shadow-[0_12px_28px_rgba(15,15,15,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-black/60">
              Attention Queue
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-black">
              Missing or incomplete configuration
            </h2>
            <div className="mt-5">
              <DataTable
                columns={[
                  { key: "source", header: "Source" },
                  { key: "present", header: "Credential Present" },
                  {
                    key: "workingStatus",
                    header: "Working Status",
                    render: (row) => <StatusBadge status={String(row.workingStatus)} />,
                  },
                  { key: "note", header: "Note" },
                ]}
                rows={missingCredentials.length ? rows.filter((row) => row.present === "Missing") : rows.slice(0, 3)}
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

