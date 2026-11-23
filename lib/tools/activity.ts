export const ACTIVE_TOOL_ACTIVITY = {
  "coordinates-converter": { label: "Coordinates Converter", category: "GIS & Field Tools" },
  "epsg-crs-finder": { label: "EPSG/CRS Finder", category: "GIS & Field Tools" },
  "distance-area-bearing": { label: "Distance/Area/Bearing Calculator", category: "GIS & Field Tools" },
  "ahp-criteria-weighting": { label: "AHP Criteria Weighting", category: "GIS & Field Tools" },
  "water-storage": { label: "Water Storage & Tank Sizing", category: "GIS & Field Tools" },
  "qr-code-generator": { label: "QR Code Generator", category: "Document Tools" },
  "html-to-pdf": { label: "HTML to PDF", category: "Document Tools" },
  "merge-pdf": { label: "Merge PDF", category: "Document Tools" },
  "split-pdf": { label: "Split PDF", category: "Document Tools" },
  "compress-pdf": { label: "Compress PDF", category: "Document Tools" },
  "pdf-to-word": { label: "PDF to Word", category: "Document Tools" },
  "pdf-to-excel": { label: "PDF to Excel", category: "Document Tools" },
  "pdf-to-powerpoint": { label: "PDF to PowerPoint", category: "Document Tools" },
  "image-to-pdf": { label: "Image to PDF", category: "Image Tools" },
} as const;

export type ActiveToolId = keyof typeof ACTIVE_TOOL_ACTIVITY;

export async function recordToolActivity(toolId: ActiveToolId, metadata: Record<string, unknown> = {}) {
  const eventId = crypto.randomUUID();
  const response = await fetch("/api/tools/activity", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventId, toolId, metadata }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Unable to record tool activity.");
}
