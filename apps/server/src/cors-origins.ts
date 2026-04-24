/**
 * CORS: browsers send `Origin` (scheme + host, no path). A trailing slash
 * in WEB_ORIGINS breaks matching, so we normalize. Optional CORS_ALLOW_VERCEL=1
 * allows any https://*.vercel.app (use for preview deployments; lock down in production).
 */
export function normalizeOrigin(raw: string): string {
  return raw.trim().replace(/\/+$/, "");
}

export function getWebOriginsList(): string[] {
  const raw = process.env.WEB_ORIGINS;
  if (raw == null || String(raw).trim() === "") {
    return ["http://localhost:3000"];
  }
  return String(raw)
    .split(",")
    .map((s) => normalizeOrigin(s))
    .filter((s) => s.length > 0);
}

export function isCorsOriginAllowed(
  requestOrigin: string | undefined,
): boolean {
  if (requestOrigin == null || requestOrigin === "") {
    return true;
  }
  const n = normalizeOrigin(requestOrigin);
  if (getWebOriginsList().some((a) => a === n)) {
    return true;
  }
  if (process.env.CORS_ALLOW_VERCEL === "1") {
    try {
      const { hostname, protocol } = new URL(n);
      if (protocol === "https:" && hostname.endsWith(".vercel.app")) {
        return true;
      }
    } catch {
      return false;
    }
  }
  return false;
}
