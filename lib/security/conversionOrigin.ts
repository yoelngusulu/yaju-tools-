import { NextRequest } from "next/server";

const STATIC_ALLOWED_HOSTS = new Set([
  "yaju-tools.com",
  "www.yaju-tools.com",
  "localhost:3000",
  "127.0.0.1:3000",
]);

function getAllowedHosts() {
  const hosts = new Set(STATIC_ALLOWED_HOSTS);

  for (const value of [
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ]) {
    if (!value) continue;

    try {
      const url = new URL(value.includes("://") ? value : `https://${value}`);
      hosts.add(url.host.toLowerCase());
    } catch {
      // Ignore malformed deployment host values.
    }
  }

  return hosts;
}

export function isAllowedConversionOrigin(
  request: NextRequest,
  allowMissingOrigin = false,
) {
  const allowedHosts = getAllowedHosts();
  const requestHost = (
    request.headers.get("host") || new URL(request.url).host
  ).toLowerCase();

  if (!allowedHosts.has(requestHost)) return false;

  const origin = request.headers.get("origin");
  if (!origin) return allowMissingOrigin;

  try {
    const parsedOrigin = new URL(origin);
    const isLocalHost = parsedOrigin.hostname === "localhost"
      || parsedOrigin.hostname === "127.0.0.1";
    const protocolIsAllowed = parsedOrigin.protocol === "https:"
      || (isLocalHost && parsedOrigin.protocol === "http:");

    return protocolIsAllowed
      && parsedOrigin.host.toLowerCase() === requestHost;
  } catch {
    return false;
  }
}
