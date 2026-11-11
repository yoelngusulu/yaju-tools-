import { headers } from "next/headers";
import { redirect } from "next/navigation";

import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import {
  CANONICAL_SITE_URL,
  isAllowedAuthHost,
} from "@/lib/auth/redirect";

export default async function ForgotPasswordPage() {
  const requestHeaders = await headers();
  const requestHost = requestHeaders.get("host");
  const allowLocalhost = process.env.NODE_ENV !== "production";

  if (!isAllowedAuthHost(requestHost, allowLocalhost)) {
    redirect(`${CANONICAL_SITE_URL}/forgot-password`);
  }

  return <ForgotPasswordForm />;
}
