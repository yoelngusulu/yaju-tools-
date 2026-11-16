import { NextRequest, NextResponse } from "next/server";
import { isAllowedConversionOrigin } from "@/lib/security/conversionOrigin";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const categories = new Set(["General feedback", "Report a problem", "Feature suggestion", "Question about a tool", "Accessibility issue"]);
const requests = new Map<string, number[]>();
const WINDOW_MS = 60 * 60 * 1000;
const MAX_SUBMISSIONS = 5;

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isRateLimited(key: string) {
  const now = Date.now();
  const recent = (requests.get(key) ?? []).filter(time => now - time < WINDOW_MS);
  if (recent.length >= MAX_SUBMISSIONS) {
    requests.set(key, recent);
    return true;
  }
  recent.push(now);
  requests.set(key, recent);
  return false;
}

export async function POST(request: NextRequest) {
  if (!isAllowedConversionOrigin(request)) return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 8_000) return NextResponse.json({ error: "Submission is too large." }, { status: 413 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  if (isRateLimited(ip)) return NextResponse.json({ error: "Too many submissions. Please try again later." }, { status: 429 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  if (clean(body.website, 200)) return NextResponse.json({ message: "Feedback received." });

  const category = clean(body.category, 50);
  const message = clean(body.message, 3000);
  const email = clean(body.email, 254).toLowerCase();
  const pageUrl = clean(body.pageUrl, 300);

  if (!categories.has(category) || message.length < 10 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return NextResponse.json({ error: "Please check the category, message and optional email address." }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("feedback_submissions").insert({
      category,
      message,
      reply_email: email || null,
      page_reference: pageUrl || null,
    });
    if (error) {
      console.error("Feedback could not be saved:", error.message);
      return NextResponse.json({ error: "We could not save your feedback right now. Please try again later." }, { status: 500 });
    }
    return NextResponse.json({ message: "Feedback received." }, { status: 201 });
  } catch (error) {
    console.error("Feedback endpoint failed:", error);
    return NextResponse.json({ error: "We could not save your feedback right now. Please try again later." }, { status: 500 });
  }
}
