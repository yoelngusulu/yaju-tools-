import { headers } from "next/headers";
import { redirect } from "next/navigation";

import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import {
  CANONICAL_SITE_URL,
  isCanonicalSiteHost,
} from "@/lib/auth/redirect";

export default async function ForgotPasswordPage() {
  const requestHeaders = await headers();
  const requestHost = requestHeaders.get("host")?.toLowerCase();
  if (!isCanonicalSiteHost(requestHost ?? null)) {
    redirect(`${CANONICAL_SITE_URL}/forgot-password`);
  }

  return <ForgotPasswordForm />;
}
