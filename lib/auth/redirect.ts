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
    const base = "https://yaju-tools.com";
    const resolved = new URL(value, base);

    if (resolved.origin !== base || resolved.pathname !== value) {
      return DEFAULT_NEXT_PATH;
    }

    return ALLOWED_NEXT_PATHS.has(resolved.pathname)
      ? resolved.pathname
      : DEFAULT_NEXT_PATH;
  } catch {
    return DEFAULT_NEXT_PATH;
  }
}
