"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";
  const [email, setEmail] = useState("admin@hiresignal.local");
  const [password, setPassword] = useState("HireSignal123!");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const response = await fetch("/api/session/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const payload = await response.json().catch(() => ({ detail: "Login failed." }));
    if (!response.ok) {
      setPending(false);
      setError(payload.detail || "Login failed.");
      return;
    }

    router.replace(next);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[2rem] border border-blue-100 bg-white p-8 shadow-[0_20px_60px_rgba(37,99,235,0.12)]"
    >
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[var(--brand-blue)]">
          Sign in
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-black">
          Enter HireSignal
        </h1>
        <p className="text-sm leading-6 text-black/65">
          Use your HireSignal account to launch campaigns, inspect companies,
          and export reports.
        </p>
      </div>

      <div className="mt-8 space-y-5">
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-black">Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-2xl border border-blue-100 px-4 py-3 text-sm text-black outline-none transition focus:border-black"
            placeholder="you@company.com"
            autoComplete="email"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-black">Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-2xl border border-blue-100 px-4 py-3 text-sm text-black outline-none transition focus:border-black"
            placeholder="Password"
            autoComplete="current-password"
          />
        </label>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-black/40"
        >
          {pending ? "Signing in..." : "Sign in"}
        </button>
      </div>
    </form>
  );
}
