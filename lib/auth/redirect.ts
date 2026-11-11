export const CANONICAL_SITE_URL = "https://yaju-tools.com";

export function isCanonicalSiteHost(host: string | null): boolean {
  return host?.toLowerCase() === new URL(CANONICAL_SITE_URL).host;
}

const DEFAULT_NEXT_PATH = "/dashboard";

const ALLOWED_NEXT_PATHS = new Set([
  "/dashboard",
  "/update-password",
  "/checkout/premium",
]);

/**
 * Accepts only explicitly approved, same-origin post-auth destinations.
 * Query strings and fragments are intentionally not accepted.
 */
export function getSafeNextPath(value: string | null | undefined): string {
  if (!value || value.length > 512) {
    return DEFAULT_NEXT_PATH;
  }

  // Reject control characters, whitespace, and backslashes before URL parsing.
  if (/[\u0000-\u0020\u007f\\]/.test(value)) {
    return DEFAULT_NEXT_PATH;
  }

  // Require a single-root-relative path; reject protocol-relative and encoded separators.
  if (!value.startsWith("/") || value.startsWith("//") || /%(?:2f|5c)/i.test(value)) {
    return DEFAULT_NEXT_PATH;
  }

  if (value.includes("?") || value.includes("#")) {
    return DEFAULT_NEXT_PATH;
  }

  try {
    const resolved = new URL(value, CANONICAL_SITE_URL);

    if (
      resolved.origin !== CANONICAL_SITE_URL ||
      resolved.pathname !== value ||
      resolved.search ||
      resolved.hash
    ) {
      return DEFAULT_NEXT_PATH;
    }

    return ALLOWED_NEXT_PATHS.has(resolved.pathname)
      ? resolved.pathname
      : DEFAULT_NEXT_PATH;
  } catch {
    return DEFAULT_NEXT_PATH;
  }
}

export function getAuthCallbackUrl(nextPath: string): string {
  const callbackUrl = new URL("/auth/callback", CANONICAL_SITE_URL);
  callbackUrl.searchParams.set("next", getSafeNextPath(nextPath));
  return callbackUrl.toString();
}

export function getRecoveryCallbackUrl(code: string): string {
  const callbackUrl = new URL(
    getAuthCallbackUrl("/update-password")
  );
  callbackUrl.searchParams.set("code", code);
  return callbackUrl.toString();
}

export function getCanonicalCallbackUrl(requestUrl: string): URL {
  const incomingUrl = new URL(requestUrl);
  const callbackUrl = new URL(
    getAuthCallbackUrl(
      getSafeNextPath(incomingUrl.searchParams.get("next"))
    )
  );
  const code = incomingUrl.searchParams.get("code");

  if (code) {
    callbackUrl.searchParams.set("code", code);
  }

  return callbackUrl;
}
