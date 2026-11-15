import type { Metadata } from "next";
import PartnersPage from "@/components/PartnersPage";

export const metadata: Metadata = {
  title: "Become a Partner",
  description: "Explore technology, business, strategic and affiliate partnership opportunities with YAJU Tools.",
  alternates: { canonical: "/partners" },
};

export default function Page() {
  return <PartnersPage />;
}
