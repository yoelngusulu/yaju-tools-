export const CANONICAL_SITE_URL = "https://yaju-tools.com";

const DEFAULT_NEXT_PATH = "/dashboard";

const ALLOWED_NEXT_PATHS = new Set([
  "/dashboard",
  "/update-password",
  "/checkout/premium",
]);

const LOCAL_DEVELOPMENT_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "[::1]",
]);

export function isLocalAuthAllowed(
  nodeEnv: string | undefined
): boolean {
  return nodeEnv === "development";
}

/**
 * Returns a trusted auth origin. Production accepts only the canonical site.
 * During local development, explicitly permitted loopback hosts are also accepted.
 */
export function getAllowedAuthOrigin(
  origin: string | null | undefined,
  allowLocalhost = false
): string | null {
  if (!origin || origin.length > 512) {
    return null;
  }

  try {
    const parsed = new URL(origin);

    if (
      parsed.username ||
      parsed.password ||
      parsed.pathname !== "/" ||
      parsed.search ||
      parsed.hash
    ) {
      return null;
    }

    if (parsed.origin === CANONICAL_SITE_URL) {
      return CANONICAL_SITE_URL;
    }

    if (
      allowLocalhost &&
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      LOCAL_DEVELOPMENT_HOSTS.has(parsed.hostname)
    ) {
      return parsed.origin;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Host-header guard for server-rendered authentication pages.
 * Hostnames are compared against an explicit canonical/loopback allowlist.
 */
export function isAllowedAuthHost(
  host: string | null,
  allowLocalhost = false
): boolean {
  if (
    !host ||
    host.length > 255 ||
    /[\s/@?#\\]/.test(host)
  ) {
    return false;
  }

  return (
    getAllowedAuthOrigin(`https://${host}`, allowLocalhost) !== null
  );
}

/**
 * Chooses an authentication callback origin without trusting arbitrary hosts.
 * Unrecognized origins always fall back to the canonical production domain.
 */
export function getAuthCallbackOrigin(
  currentOrigin: string | null | undefined,
  allowLocalhost = false
): string {
  return (
    getAllowedAuthOrigin(currentOrigin, allowLocalhost) ??
    CANONICAL_SITE_URL
  );
}

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

export function getAuthCallbackUrl(
  nextPath: string,
  currentOrigin?: string | null,
  allowLocalhost = false
): string {
  const callbackUrl = new URL(
    "/auth/callback",
    getAuthCallbackOrigin(currentOrigin, allowLocalhost)
  );
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
