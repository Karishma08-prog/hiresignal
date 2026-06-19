import { NextRequest, NextResponse } from "next/server";
import { buildApiUrl, SESSION_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const upstream = await fetch(buildApiUrl("auth/login"), {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const payload = await upstream.json().catch(() => ({ detail: "Login failed." }));
  if (!upstream.ok) {
    return NextResponse.json(payload, { status: upstream.status });
  }

  const token = payload?.item?.token;
  if (!token) {
    return NextResponse.json({ detail: "Login token was not returned." }, { status: 500 });
  }

  const response = NextResponse.json({
    item: {
      user: payload.item.user,
      expiresAt: payload.item.expiresAt,
    },
  });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return response;
}
