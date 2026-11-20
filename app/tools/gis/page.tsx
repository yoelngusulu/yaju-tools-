import { Database, Droplets, MapPinned, Ruler, Scale } from "lucide-react";

import ToolHubPage from "@/components/ToolHubPage";

const fieldTools = [
  {
    title: "Coordinates Converter",
    description:
      "Convert coordinates between Decimal Degrees, DMS and UTM with bulk CSV/Excel support and map preview.",
    href: "/tools/coordinates-converter",
    icon: MapPinned,
    badge: "Live",
    status: "available" as const,
  },
  {
    title: "EPSG / CRS Finder",
    description:
      "Find coordinate reference systems used in Tanzania and East Africa by EPSG code, name or area.",
    href: "/tools/gis/epsg-crs-finder",
    icon: Database,
    badge: "New",
    status: "available" as const,
  },
  {
    title: "Distance, Area & Bearing Calculator",
    description:
      "Measure distance, bearings, perimeter and approximate area from Decimal, DMS, UTM or CSV coordinate points.",
    href: "/tools/gis/distance-area-calculator",
    icon: Ruler,
    badge: "Live",
    status: "available" as const,
  },
  {
    title: "AHP Criteria Weighting",
    description:
      "Calculate relative GIS criterion weights using Saaty pairwise comparisons and consistency analysis.",
    href: "/tools/gis/ahp-calculator",
    icon: Scale,
    badge: "New",
    status: "available" as const,
  },
  {
    title: "Water Storage & Tank Sizing",
    description:
      "Estimate storage for rainwater harvesting, borehole and pumping systems, irrigation demand and physical tank dimensions.",
    href: "/tools/gis/water-storage-calculator",
    icon: Droplets,
    badge: "New",
    status: "available" as const,
  },
];

export const metadata = {
  title: "Free GIS Tools: CRS/EPSG Finder & Field Tools",
  description:
    "YAJU Field Tools for coordinate conversion, distance and area measurement, water storage and tank sizing, irrigation storage and bearing calculations.",
  alternates: { canonical: "/tools/gis" },
};

export default function GISToolsPage() {
  return (
    <ToolHubPage
      eyebrow="YAJU Field Tools"
      title="YAJU Field Tools"
      subtitle="Practical tools for GIS, surveying, water, irrigation and engineering fieldwork — from coordinate conversion and field measurements to tank sizing and bearing calculations."
      backLink="/tools"
      backText="Back to Tools"
      tools={fieldTools}
    />
  );
}
