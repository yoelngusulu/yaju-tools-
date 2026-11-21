import type { Metadata } from "next";
import AHPWorkbench from "@/components/gis/AHPWorkbench";

export const metadata: Metadata = {
  title: "AHP Criteria Weighting Calculator | YAJU",
  description: "Calculate GIS criterion weights using Analytic Hierarchy Process pairwise comparisons and consistency analysis.",
  alternates: { canonical: "/tools/gis/ahp-calculator" },
};

export default function AHPCalculatorPage() {
  return <AHPWorkbench />;
}
