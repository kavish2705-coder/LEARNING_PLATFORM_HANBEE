import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fullName, email, phone, location, track, message } = body;

    // Validate required fields
    if (!fullName || !email || !phone) {
      return NextResponse.json(
        { error: "Full name, email, and phone are required." },
        { status: 400 }
      );
    }

    // In local development / demo, we log the received application
    console.log("[INDEPENDENT STUDENT APPLICATION RECEIVED]:", {
      timestamp: new Date().toISOString(),
      fullName,
      email,
      phone,
      location,
      track,
      message,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Application recorded successfully.",
        data: {
          fullName,
          email,
          phone,
          location,
          track,
        },
      },
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
