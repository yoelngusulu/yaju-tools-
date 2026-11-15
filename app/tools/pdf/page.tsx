import {
  Archive,
  FileCode2,
  FileImage,
  FileText,
  Lock,
  Merge,
  Presentation,
  QrCode,
  Scissors,
  Table2,
  UnlockKeyhole,
} from "lucide-react";

import ToolHubPage from "@/components/ToolHubPage";

export const metadata = {
  title: "Free PDF Tools: Convert, Merge, Split & Compress",
  alternates: { canonical: "/tools/pdf" },
};

const pdfTools = [
  {
    title: "QR Code Generator",
    description: "Create a custom QR code for a website, text, email, phone number or Wi-Fi network; download PNG or SVG.",
    href: "/tools/pdf/qr-code-generator",
    icon: QrCode,
    badge: "New",
    status: "available" as const,
  },
  {
    title: "HTML to PDF",
    description:
      "Open HEC-HMS reports and other HTML files, preview the layout, and save them as PDF in your browser.",
    href: "/tools/pdf/html-to-pdf",
    icon: FileCode2,
    badge: "New",
    status: "available" as const,
  },
  {
    title: "Merge PDF",
    description:
      "Combine multiple PDF files into a single document. Live on Vercel.",
    href: "/tools/pdf/merge-pdf",
    icon: Merge,
    badge: "Live",
    status: "available" as const,
  },
  {
    title: "Split PDF",
    description:
      "Divide one PDF into selected ranges or smaller parts. Live on Vercel.",
    href: "/tools/pdf/split-pdf",
    icon: Scissors,
    badge: "Live",
    status: "available" as const,
  },
  {
    title: "Compress PDF",
    description:
      "Reduce PDF file size for easier sharing. Live on Vercel.",
    href: "/tools/pdf/compress-pdf",
    icon: Archive,
    badge: "Live",
    status: "available" as const,
  },
  {
    title: "PDF to Word",
    description:
      "Convert PDF documents into editable Word files.",
    href: "/tools/pdf/pdf-to-word",
    icon: FileText,
    badge: "Live",
    status: "available" as const,
  },
  {
    title: "PDF to Excel",
    description:
      "Convert PDF tables into editable Excel spreadsheets.",
    href: "/tools/pdf/pdf-to-excel",
    icon: Table2,
    badge: "Live",
    status: "available" as const,
  },
  {
    title: "PDF to PowerPoint",
    description:
      "Convert PDF pages into PowerPoint presentations.",
    href: "/tools/pdf/pdf-to-powerpoint",
    icon: Presentation,
    badge: "Live",
    status: "available" as const,
  },
  {
    title: "PDF to Image",
    description:
      "Prepared for the dedicated rendering server required for high-quality page images.",
    href: "/tools/pdf/pdf-to-image",
    icon: FileImage,
    badge: "Coming Soon",
    status: "server-coming-soon" as const,
  },
  {
    title: "Protect PDF",
    description:
      "Prepared for the dedicated QPDF server required for password protection.",
    href: "/tools/pdf/protect-pdf",
    icon: Lock,
    badge: "Coming Soon",
    status: "server-coming-soon" as const,
  },
  {
    title: "Unlock PDF",
    description:
      "Prepared for the dedicated QPDF server required for secure PDF unlocking.",
    href: "/tools/pdf/unlock-pdf",
    icon: UnlockKeyhole,
    badge: "Coming Soon",
    status: "server-coming-soon" as const,
  },
];

export default function PDFToolsPage() {
  return (
    <ToolHubPage
      eyebrow="YAJU Documents"
      title="YAJU Documents"
      subtitle="Explore eight live document tools. Tools that are not yet complete are clearly marked Coming Soon."
      tools={pdfTools}
    />
  );
}
