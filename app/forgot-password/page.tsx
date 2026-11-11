import { headers } from "next/headers";
import { redirect } from "next/navigation";

import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import {
  CANONICAL_SITE_URL,
  isLocalAuthAllowed,
  isAllowedAuthHost,
} from "@/lib/auth/redirect";

export default async function ForgotPasswordPage() {
  const requestHeaders = await headers();
  const requestHost = requestHeaders.get("host");
  const allowLocalhost = isLocalAuthAllowed(process.env.NODE_ENV);

  if (!isAllowedAuthHost(requestHost, allowLocalhost)) {
    redirect(`${CANONICAL_SITE_URL}/forgot-password`);
  }

  return <ForgotPasswordForm />;
}
