import type { Metadata } from "next";

import EpsgCrsFinder from "@/components/EpsgCrsFinder";

export const metadata: Metadata = {
  title: "EPSG / CRS Finder",
  description:
    "Find common EPSG coordinate reference systems for Tanzania and East Africa, inspect projection details, and copy CRS definitions.",
  alternates: { canonical: "/tools/gis/epsg-crs-finder" },
};

export default function EpsgCrsFinderPage() {
  return <EpsgCrsFinder />;
}
