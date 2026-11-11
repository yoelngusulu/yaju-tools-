import { headers } from "next/headers";
import { redirect } from "next/navigation";

import RegisterForm from "@/components/auth/RegisterForm";
import {
  CANONICAL_SITE_URL,
  isLocalAuthAllowed,
  getSafeNextPath,
  isAllowedAuthHost,
} from "@/lib/auth/redirect";

type RegisterPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RegisterPage({
  searchParams,
}: RegisterPageProps) {
  const [requestHeaders, params] = await Promise.all([
    headers(),
    searchParams,
  ]);

  const allowLocalhost = isLocalAuthAllowed(process.env.NODE_ENV);
  const requestHost = requestHeaders.get("host");
  const nextValue = typeof params.next === "string" ? params.next : null;
  const nextPath = getSafeNextPath(nextValue);

  if (!isAllowedAuthHost(requestHost, allowLocalhost)) {
    const canonicalRegisterUrl = new URL("/register", CANONICAL_SITE_URL);

    if (nextPath !== "/dashboard") {
      canonicalRegisterUrl.searchParams.set("next", nextPath);
    }

    redirect(canonicalRegisterUrl.toString());
  }

  return <RegisterForm nextPath={nextPath} />;
}
