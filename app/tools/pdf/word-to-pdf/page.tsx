import type { Metadata } from "next";

import ToolPage from "@/components/ToolPage";

export const metadata: Metadata = {
  title: "Word to PDF Converter | YAJU",
  description: "Convert Word documents to PDF online with YAJU.",
  alternates: { canonical: "/tools/pdf/word-to-pdf" },
};

export default function ToolRoutePage() {
  return (
    <ToolPage
      tool="word-to-pdf"
      backLink="/tools/pdf"
      backText="Back to PDF Tools"
    />
  );
}
