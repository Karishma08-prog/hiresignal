export const SESSION_COOKIE = "hiresignal_session";

export function resolveBackendApiBase() {
  const configuredBase = (
    process.env.HIRESIGNAL_INTERNAL_API_BASE_URL?.trim()
    || process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
    || "http://127.0.0.1:8000"
  );

  return configuredBase.endsWith("/api")
    ? configuredBase
    : `${configuredBase.replace(/\/+$/, "")}/api`;
}

export function buildApiUrl(path: string) {
  return new URL(path.replace(/^\/+/, ""), `${resolveBackendApiBase()}/`).toString();
}
