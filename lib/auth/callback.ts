import {
  CANONICAL_SITE_URL,
  getSafeNextPath,
} from "./redirect";

type CodeExchange = (
  code: string
) => Promise<{ error: unknown | null }>;

export async function getAuthCallbackDestination(
  requestUrl: string,
  exchangeCode: CodeExchange
): Promise<URL> {
  const callbackUrl = new URL(requestUrl);
  const code = callbackUrl.searchParams.get("code");
  const nextPath = getSafeNextPath(
    callbackUrl.searchParams.get("next")
  );
  const isPasswordReset = nextPath === "/update-password";

  if (!code) {
    const path = isPasswordReset
      ? "/forgot-password?error=missing-code"
      : "/login?error=auth-callback";
    return new URL(path, CANONICAL_SITE_URL);
  }

  const { error } = await exchangeCode(code);

  if (error) {
    const path = isPasswordReset
      ? "/forgot-password?error=reset-link-invalid"
      : "/login?error=auth-callback";
    return new URL(path, CANONICAL_SITE_URL);
  }

  return new URL(nextPath, CANONICAL_SITE_URL);
}
