import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.12),transparent_45%),linear-gradient(180deg,#ffffff_0%,#eef4ff_100%)] px-4 py-12">
      <div className="grid w-full max-w-5xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--brand-blue)]">
            HireSignal
          </p>
          <h1 className="max-w-xl text-5xl font-semibold tracking-tight text-black">
            Hiring-intent sourcing for teams that need signal, not noise.
          </h1>
          <p className="max-w-xl text-lg leading-8 text-black/70">
            Launch campaign-driven sourcing runs, inspect matched companies,
            and export reports from a single workspace.
          </p>
          <div className="rounded-[2rem] border border-blue-100 bg-white/90 p-6 text-sm leading-7 text-black/70 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            <p className="font-semibold text-black">Default local admin</p>
            <p className="mt-2">Email: <span className="font-medium text-black">admin@hiresignal.local</span></p>
            <p>Password: <span className="font-medium text-black">HireSignal123!</span></p>
          </div>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}
