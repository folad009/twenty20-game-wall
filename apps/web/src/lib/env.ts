/**
 * NEXT_PUBLIC_* must be absolute URLs (https://...) or the browser treats them
 * as paths on the current site, e.g. vercel.app/your-api.railway.app/auth/login → 404.
 */
function normalizePublicApiUrl(raw: string | undefined, fallback: string): string {
  const v = (raw ?? fallback).trim().replace(/\/+$/, "");
  if (!v) return fallback;
  if (/^https?:\/\//i.test(v)) return v;
  if (/^(localhost|127\.0\.0\.1)/i.test(v)) return `http://${v}`;
  return `https://${v}`;
}

const fallback = "http://localhost:4000";

export const apiBaseUrl = normalizePublicApiUrl(
  process.env.NEXT_PUBLIC_API_URL,
  fallback,
);

export const socketUrl = normalizePublicApiUrl(
  process.env.NEXT_PUBLIC_SOCKET_URL ?? process.env.NEXT_PUBLIC_API_URL,
  apiBaseUrl,
);
