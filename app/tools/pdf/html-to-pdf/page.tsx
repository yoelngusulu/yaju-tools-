import type { Metadata } from "next";

import HtmlToPdfConverter from "@/components/HtmlToPdfConverter";

export const metadata: Metadata = {
  title: "HTML to PDF",
  description:
    "Open HEC-HMS reports and other HTML files, preview them safely, and save a print-ready PDF in your browser.",
  alternates: { canonical: "/tools/pdf/html-to-pdf" },
};

export default function HtmlToPdfPage() {
  return <HtmlToPdfConverter />;
}
