// Public course-application lead form (no account/session required).
// Course titles come from a real, anonymous read of published courses
// (RLS: "published courses readable by all" -- no auth.uid() check) so the
// dropdown always reflects what's actually live, instead of free text.

function getPublicSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("This form isn't configured yet. Add the Supabase URL and public anon key to the frontend environment.");
  }
  return { url, anonKey };
}

export async function fetchPublishedCourseTitles(): Promise<string[]> {
  const { url, anonKey } = getPublicSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/courses?select=title&status=eq.published&order=title.asc`, {
    headers: { apikey: anonKey },
  });
  if (!response.ok) return [];
  const rows = (await response.json()) as { title: string }[];
  return rows.map((r) => r.title);
}

export interface ApplicationPayload {
  fullName: string;
  email: string;
  phone: string;
  courseTitle: string;
  message: string;
  turnstileToken: string;
}

export async function submitApplication(payload: ApplicationPayload): Promise<void> {
  const { url, anonKey } = getPublicSupabaseConfig();
  const response = await fetch(`${url}/functions/v1/submit-application`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: anonKey },
    body: JSON.stringify({
      full_name: payload.fullName,
      email: payload.email,
      phone: payload.phone,
      course_title: payload.courseTitle,
      message: payload.message,
      turnstile_token: payload.turnstileToken,
    }),
  });
  if (!response.ok) {
    let errorMessage = "Something went wrong submitting your application. Please try again.";
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) errorMessage = body.error;
    } catch {
      // Non-JSON error body; fall back to the generic message.
    }
    throw new Error(errorMessage);
  }
}
