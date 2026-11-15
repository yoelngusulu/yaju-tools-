import {
  Archive,
  FileImage,
} from "lucide-react";

import ToolHubPage from "@/components/ToolHubPage";

export const metadata = {
  title: "Image to PDF Converter & Online Image Tools",
  alternates: { canonical: "/tools/image" },
};

const imageTools = [
  {
    title: "Image to PDF",
    description:
      "Convert JPG and PNG images into one PDF document. Live on Vercel.",
    href: "/tools/image/image-to-pdf",
    icon: FileImage,
    badge: "Live",
    status: "available" as const,
  },
  {
    title: "Compress Image",
    description:
      "Prepared for a production-safe image compression engine or conversion worker.",
    href: "/tools/image/compress-image",
    icon: Archive,
    badge: "Server soon",
    status: "server-coming-soon" as const,
  },
];

export default function ImageToolsPage() {
  return (
    <ToolHubPage
      eyebrow="YAJU Images"
      title="YAJU Images"
      subtitle="Use Image to PDF now on Vercel while image compression is prepared for production processing."
      tools={imageTools}
    />
  );
}
