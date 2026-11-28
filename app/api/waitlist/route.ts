import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Request not allowed." }, { status: 403 });
  }

  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ error: "Invalid request." }, { status: 415 });
  }

  let body: { email?: unknown; website?: unknown; consent?: unknown };
  try {
    const raw = await request.text();
    if (raw.length > 2048) return NextResponse.json({ error: "Request too large." }, { status: 413 });
    body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid");
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (typeof body.website === "string" && body.website.trim()) {
    return NextResponse.json({ message: "Thank you. Your request was received." });
  }

  if (typeof body.email !== "string") {
    return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
  }
  const email = body.email.trim().toLowerCase();
  if (email.length > 254 || !emailPattern.test(email)) {
    return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
  }
  if (body.consent !== true) {
    return NextResponse.json({ error: "Please agree to receive YAJU updates." }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("waitlist_subscribers")
      .upsert({ email }, { onConflict: "email", ignoreDuplicates: true });
    if (error) throw error;
    return NextResponse.json({ message: "Thank you! Your request has been received." });
  } catch (error) {
    console.error("[waitlist] Submission failed:", error);
    return NextResponse.json(
      { error: "Waitlist is temporarily unavailable. Please try again later." },
      { status: 503 }
    );
  }
}
