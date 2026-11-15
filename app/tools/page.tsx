import ToolCategories from "@/components/ToolCategories";

export const metadata = {
  title: "Tools | YAJU",
  description:
    "Choose YAJU Field Tools, YAJU Documents and YAJU Images tools.",
  alternates: { canonical: "/tools" },
};

export default function ToolsPage() {
  return (
    <main className="min-h-screen bg-white">
      <ToolCategories />
    </main>
  );
}
