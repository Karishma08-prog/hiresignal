"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/session/logout", {
      method: "POST",
    });
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="rounded-full border border-blue-100 bg-white px-4 py-3 text-sm font-semibold text-black/70 transition hover:border-black hover:text-black"
      type="button"
    >
      Log out
    </button>
  );
}
