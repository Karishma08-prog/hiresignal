import { NextRequest, NextResponse } from "next/server";
import { buildApiUrl, SESSION_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value?.trim();
  if (!token) {
    return NextResponse.json({ detail: "Not signed in." }, { status: 401 });
  }

  const upstream = await fetch(buildApiUrl("auth/me"), {
    method: "GET",
    headers: {
      authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const payload = await upstream.json().catch(() => ({ detail: "Unable to load session." }));
  return NextResponse.json(payload, { status: upstream.status });
}
