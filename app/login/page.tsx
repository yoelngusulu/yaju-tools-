import { headers } from "next/headers";
import { redirect } from "next/navigation";

import LoginForm from "@/components/auth/LoginForm";
import {
  CANONICAL_SITE_URL,
  isLocalAuthAllowed,
  getSafeNextPath,
  isAllowedAuthHost,
} from "@/lib/auth/redirect";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [requestHeaders, params] = await Promise.all([
    headers(),
    searchParams,
  ]);

  const allowLocalhost = isLocalAuthAllowed(process.env.NODE_ENV);
  const requestHost = requestHeaders.get("host");
  const nextValue = typeof params.next === "string" ? params.next : null;
  const nextPath = getSafeNextPath(nextValue);

  if (!isAllowedAuthHost(requestHost, allowLocalhost)) {
    const canonicalLoginUrl = new URL("/login", CANONICAL_SITE_URL);

    if (nextPath !== "/dashboard") {
      canonicalLoginUrl.searchParams.set("next", nextPath);
    }

    redirect(canonicalLoginUrl.toString());
  }

  return <LoginForm nextPath={nextPath} />;
}
