import type { MetadataRoute } from "next";

const baseUrl = "https://yaju-tools.com";

type ChangeFrequency = NonNullable<
  MetadataRoute.Sitemap[number]["changeFrequency"]
>;

type SitemapRoute = {
  path: string;
  changeFrequency: ChangeFrequency;
  priority: number;
};

const routes: SitemapRoute[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/tools", changeFrequency: "weekly", priority: 0.9 },
  { path: "/tools/gis", changeFrequency: "weekly", priority: 0.9 },
  { path: "/tools/pdf", changeFrequency: "weekly", priority: 0.85 },
  { path: "/tools/image", changeFrequency: "weekly", priority: 0.85 },
  { path: "/tools/coordinates-converter", changeFrequency: "monthly", priority: 0.85 },
  { path: "/tools/gis/epsg-crs-finder", changeFrequency: "monthly", priority: 0.8 },
  { path: "/tools/gis/distance-area-calculator", changeFrequency: "monthly", priority: 0.8 },
  { path: "/tools/gis/water-storage-calculator", changeFrequency: "monthly", priority: 0.8 },
  { path: "/tools/gis/ahp-calculator", changeFrequency: "monthly", priority: 0.85 },
  { path: "/tools/pdf/html-to-pdf", changeFrequency: "monthly", priority: 0.85 },
  { path: "/tools/pdf/qr-code-generator", changeFrequency: "monthly", priority: 0.85 },
  { path: "/tools/pdf/word-to-pdf", changeFrequency: "monthly", priority: 0.8 },
  { path: "/tools/pdf/pdf-to-word", changeFrequency: "monthly", priority: 0.8 },
  { path: "/tools/pdf/pdf-to-excel", changeFrequency: "monthly", priority: 0.8 },
  { path: "/tools/pdf/pdf-to-powerpoint", changeFrequency: "monthly", priority: 0.8 },
  { path: "/tools/pdf/merge-pdf", changeFrequency: "monthly", priority: 0.8 },
  { path: "/tools/pdf/split-pdf", changeFrequency: "monthly", priority: 0.8 },
  { path: "/tools/pdf/compress-pdf", changeFrequency: "monthly", priority: 0.8 },
  { path: "/tools/image/image-to-pdf", changeFrequency: "monthly", priority: 0.8 },
  { path: "/learn", changeFrequency: "weekly", priority: 0.85 },
  { path: "/learn/examples", changeFrequency: "monthly", priority: 0.8 },
  { path: "/learn/coordinate-systems-and-coordinate-conversion", changeFrequency: "monthly", priority: 0.8 },
  { path: "/learn/measuring-distance-and-area-in-gis", changeFrequency: "monthly", priority: 0.8 },
  { path: "/learn/water-storage-sizing-rainwater-and-borehole", changeFrequency: "monthly", priority: 0.8 },
  { path: "/learn/preparing-pdf-files-for-work-and-sharing", changeFrequency: "monthly", priority: 0.8 },
  { path: "/learn/rainfall-data-dry-periods-and-water-balance", changeFrequency: "monthly", priority: 0.8 },
  { path: "/learn/ahp-in-gis-pairwise-comparisons-and-priority-weights", changeFrequency: "monthly", priority: 0.8 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.7 },
  { path: "/whats-new", changeFrequency: "weekly", priority: 0.7 },
  { path: "/feedback", changeFrequency: "monthly", priority: 0.5 },
  { path: "/docs", changeFrequency: "monthly", priority: 0.8 },
  { path: "/docs/yaju-user-guide", changeFrequency: "monthly", priority: 0.8 },
  { path: "/docs/getting-started", changeFrequency: "monthly", priority: 0.75 },
  { path: "/docs/documents", changeFrequency: "monthly", priority: 0.75 },
  { path: "/docs/images", changeFrequency: "monthly", priority: 0.75 },
  { path: "/pricing", changeFrequency: "monthly", priority: 0.6 },
  { path: "/about", changeFrequency: "monthly", priority: 0.6 },
  { path: "/partners", changeFrequency: "monthly", priority: 0.7 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.4 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.4 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return routes.map((route) => ({
    url: `${baseUrl}${route.path === "/" ? "" : route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
