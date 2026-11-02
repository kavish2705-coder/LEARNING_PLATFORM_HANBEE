import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Previously this only console.log'd the submission -- nothing was ever
// persisted, so staff were never actually notified and the form's "PADDOCK
// ENTRY CONFIRMED" success state was pure fiction. independent_student_leads
// (0108_independent_student_leads.sql) is anon-insertable by design, the
// same pattern as the existing tournament_registrations table -- a public
// form needs no login, and creating a real account still requires staff
// judgment via the existing staff-only invite flow, so this intentionally
// does not create an account or invitation on its own.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fullName, email, phone, location, track, message } = body;

    if (!fullName?.trim() || !email?.trim() || !phone?.trim()) {
      return NextResponse.json(
        { error: "Full name, email, and phone are required." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
      throw new Error("Supabase is not configured on the server.");
    }

    const res = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/independent_student_leads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        location: (location ?? "").trim(),
        track: (track ?? "").trim(),
        message: (message ?? "").trim(),
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      // A duplicate pending lead for the same email hits the unique index
      // and is the one case worth a specific message; everything else is a
      // genuine failure and must not be reported as a success.
      if (res.status === 409 || detail.includes("independent_student_leads_pending_email_idx")) {
        return NextResponse.json(
          { error: "We already have a pending application for this email -- our team will reach out soon." },
          { status: 409 }
        );
      }
      console.error("[INDEPENDENT STUDENT LEAD INSERT FAILED]:", res.status, detail);
      return NextResponse.json(
        { error: "We couldn't save your application. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Application recorded successfully." },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[INDEPENDENT STUDENT API ERROR]:", error);
    return NextResponse.json(
      { error: "Failed to process application." },
      { status: 500 }
    );
  }
}
