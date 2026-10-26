export type HanbeeRole = "student" | "school_staff" | "staff" | "manager";

export interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  token_type: string;
  user: { id: string; email?: string; user_metadata?: Record<string, any> };
}

export interface SignedInAccount {
  session: SupabaseSession;
  role: HanbeeRole;
  approved: boolean;
  accountStatus: string;
}

export const AUTH_SESSION_KEY = "hanbee-auth-session";

interface SupabaseErrorBody {
  message?: string;
  msg?: string;
  error_description?: string;
  error?: string;
}

interface AuthSessionResponse extends SupabaseSession {
  expires_in?: number;
}

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Sign-in is not configured yet. Add the Supabase URL and public anon key to the frontend environment.");
  }
  return { url, anonKey };
}

async function readError(response: Response, fallback: string) {
  let body: SupabaseErrorBody = {};
  try {
    body = (await response.json()) as SupabaseErrorBody;
  } catch {
    // Supabase can return an empty body for upstream errors.
  }
  return body.message || body.msg || body.error_description || body.error || fallback;
}

async function supabaseFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { url, anonKey } = getSupabaseConfig();
  const headers = new Headers(init.headers);
  headers.set("apikey", anonKey);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(`${url}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    throw new Error(await readError(response, "Supabase couldn't complete the request."));
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export async function checkManagerExists(): Promise<boolean> {
  return supabaseFetch<boolean>("/rest/v1/rpc/manager_exists", { method: "POST", body: JSON.stringify({}) });
}

export type SignInResult = SignedInAccount;

export async function signInWithPassword(email: string, password: string): Promise<SignInResult> {
  const auth = await supabaseFetch<AuthSessionResponse>("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email: email.trim(), password }),
  });

  const session = toSupabaseSession(auth);
  const account = await loadAccount(auth);
  return { session, ...account };
}

export async function signInWithUsername(username: string, password: string): Promise<SignInResult> {
  const email = await supabaseFetch<string | null>("/rest/v1/rpc/resolve_student_login_email", {
    method: "POST",
    body: JSON.stringify({ p_username: username.trim() }),
  });
  if (!email) {
    throw new Error("We couldn't find that username. Please check it and try again.");
  }
  return signInWithPassword(email, password);
}

export interface CreateStudentAccountsResult {
  results: { username: string; fullName: string; password?: string; result: string }[];
}

export async function createStudentAccounts(orgId: string, students: { fullName: string; username: string }[]) {
  return authenticatedSupabaseFetch<CreateStudentAccountsResult>("/functions/v1/create-student-accounts", {
    method: "POST",
    body: JSON.stringify({ orgId, students }),
  });
}

// Adds or changes the signed-in account's own email. Completes immediately
// (no confirmation email sent) via the update-my-email Edge Function's
// Admin API call — see that function's header comment for why.
export async function updateMyEmail(email: string) {
  return authenticatedSupabaseFetch<{ email: string }>("/functions/v1/update-my-email", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}


async function loadAccount(session: Pick<SupabaseSession, "access_token" | "user">) {
  // DEVELOPER BYPASS
  if (session.user.id.startsWith("dummy-")) {
    const dummyRole = session.user.id.split("-")[1] as HanbeeRole;
    return { role: dummyRole, approved: true, accountStatus: "active" };
  }

  const { url, anonKey } = getSupabaseConfig();
  const profileUrl = new URL(`${url}/rest/v1/profiles`);
  profileUrl.searchParams.set("select", "role,approved,account_status");
  profileUrl.searchParams.set("id", `eq.${session.user.id}`);
  const profileResponse = await fetch(profileUrl, {
    headers: { apikey: anonKey, Authorization: `Bearer ${session.access_token}` },
  });

  if (!profileResponse.ok) {
    throw new Error(await readError(profileResponse, "We couldn't load your account. Please try again."));
  }

  const profiles = (await profileResponse.json()) as Array<{
    role: HanbeeRole;
    approved: boolean;
    account_status: string;
  }>;
  const profile = profiles[0];
  if (!profile || !["student", "school_staff", "staff", "manager"].includes(profile.role)) {
    throw new Error("Your account profile is missing or has an unsupported role. Contact Hanbee support.");
  }
  if (profile.account_status !== "active") {
    throw new Error("This account is suspended or inactive. Contact your school or Hanbee support.");
  }
  return { role: profile.role, approved: profile.approved, accountStatus: profile.account_status };
}

export function signInWithProvider(provider: "google" | "github") {
  const { url } = getSupabaseConfig();
  const redirectTo = `${window.location.origin}/login`;
  window.location.href = `${url}/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(redirectTo)}`;
}

export function readStoredSession(): SupabaseSession | null {
  try {
    const value = window.localStorage.getItem(AUTH_SESSION_KEY);
    if (!value) return null;
    const session = JSON.parse(value) as SupabaseSession;
    return session.access_token && session.refresh_token && session.user?.id ? session : null;
  } catch {
    return null;
  }
}

export function writeStoredSession(session: SupabaseSession): void {
  try {
    window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  } catch {
    // ignore
  }
}

export async function refreshSession(session: SupabaseSession): Promise<SupabaseSession> {
  const refreshed = await supabaseFetch<AuthSessionResponse>("/auth/v1/token?grant_type=refresh_token", {
    method: "POST",
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  });
  return {
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token,
    token_type: refreshed.token_type,
    user: refreshed.user,
    ...(refreshed.expires_in ? { expires_at: Math.floor(Date.now() / 1000) + refreshed.expires_in } : {}),
  };
}

export async function getCurrentAccount(session: SupabaseSession): Promise<SignedInAccount> {
  // DEVELOPER BYPASS
  if (session.user.id.startsWith("dummy-")) {
    const dummyRole = session.user.id.split("-")[1] as HanbeeRole;
    return { session, role: dummyRole, approved: true, accountStatus: "active" };
  }

  const refreshed = session.expires_at && session.expires_at <= Math.floor(Date.now() / 1000) + 60
    ? await refreshSession(session)
    : session;
  const user = await supabaseFetch<{ id: string; email?: string }>("/auth/v1/user", {
    headers: { Authorization: `Bearer ${refreshed.access_token}` },
  });
  const verifiedSession = { ...refreshed, user };
  const account = await loadAccount(verifiedSession);
  return { session: verifiedSession, ...account };
}

export async function signOut(session: SupabaseSession | null) {
  try {
    if (session?.access_token) {
      await supabaseFetch<unknown>("/auth/v1/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
    }
  } finally {
    window.localStorage.removeItem(AUTH_SESSION_KEY);
  }
}

export async function authenticatedSupabaseFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let session = readStoredSession();
  if (!session) throw new Error("Your session has expired. Sign in again to continue.");

  // DEVELOPER BYPASS
  if (session.user.id.startsWith("dummy-")) {
    console.log(`[Developer Bypass] Muted authenticatedSupabaseFetch to: ${path}`);
    if (path.includes("select=") || path.includes("/rest/v1/")) {
      return [] as unknown as T;
    }
    return null as unknown as T;
  }

  if (session.expires_at && session.expires_at <= Math.floor(Date.now() / 1000) + 60) {
    session = await refreshSession(session);
    window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  }
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${session.access_token}`);
  return supabaseFetch<T>(path, {
    ...init,
    headers,
  });
}

export async function signUpWithPassword(input: {
  fullName: string;
  email: string;
  password: string;
  role: "student" | "staff" | "school_staff" | "manager";
  inviteToken?: string;
  joinToken?: string;
  schoolName?: string;
  guardianConsent?: boolean;
}) {
  const data: Record<string, string> = {
    full_name: input.fullName.trim(),
    role: input.role,
  };
  if (input.inviteToken) data.invite_token = input.inviteToken.trim();
  if (input.joinToken) data.join_token = input.joinToken.trim();
  if (input.role === "school_staff") {
    data.school_name = input.schoolName?.trim() ?? "";
    data.guardian_consent = input.guardianConsent ? "true" : "false";
  }

  const confirmationRedirect = typeof window === "undefined" ? undefined : `${window.location.origin}/login?signup=confirmed`;
  const signupPath = confirmationRedirect
    ? `/auth/v1/signup?redirect_to=${encodeURIComponent(confirmationRedirect)}`
    : "/auth/v1/signup";
  // Migration 0045 auto-confirms new email addresses, so this returns a
  // full session (same shape as login) immediately, not just a user stub.
  return supabaseFetch<AuthSessionResponse>(signupPath, {
    method: "POST",
    body: JSON.stringify({
      email: input.email.trim(),
      password: input.password,
      data,
    }),
  });
}

// For a student who received a per-student username-based invite link
// (migration 0088) instead of an email invite — there's no real email to
// collect, so one is auto-generated here purely as an internal identifier
// Supabase Auth requires; it's never shown anywhere and login is always by
// username via signInWithUsername/resolve_student_login_email.
export async function signUpStudentWithUsernameInvite(input: {
  fullName: string;
  username: string;
  phone: string;
  password: string;
  inviteToken: string;
}) {
  const placeholderEmail = `${input.username.trim().toLowerCase()}.${crypto.randomUUID().slice(0, 8)}@students.hanbee.internal`;
  const data: Record<string, string> = {
    full_name: input.fullName.trim(),
    role: "student",
    invite_token: input.inviteToken.trim(),
    invite_username: input.username.trim().toLowerCase(),
    phone: input.phone.trim(),
  };
  return supabaseFetch<AuthSessionResponse>("/auth/v1/signup", {
    method: "POST",
    body: JSON.stringify({ email: placeholderEmail, password: input.password, data }),
  });
}

export async function requestPasswordReset(email: string) {
  getSupabaseConfig();
  const redirectTo = typeof window === "undefined" ? undefined : `${window.location.origin}/reset-password`;
  const recoveryPath = redirectTo
    ? `/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`
    : "/auth/v1/recover";
  return supabaseFetch<{ message?: string }>(recoveryPath, {
    method: "POST",
    body: JSON.stringify({ email: email.trim() }),
  });
}

export async function updatePassword(accessToken: string, password: string) {
  // Dev-only bypass, same pattern/reasoning as login/page.tsx's: gated on
  // NODE_ENV so Next.js dead-code-eliminates this branch from prod bundles.
  if (process.env.NODE_ENV === "development" && accessToken === "dummy-token") {
    return { id: "dummy-student", email: "student@hanbee.in" };
  }
  return supabaseFetch<{ id: string; email?: string }>("/auth/v1/user", {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ password }),
  });
}

export interface AccountProfile {
  id: string;
  email: string | null;
  username: string | null;
  full_name: string;
  role: HanbeeRole;
  avatar_url: string | null;
}

export async function getAccountProfile() {
  const session = readStoredSession();
  if (!session) throw new Error("Your session has expired. Sign in again to continue.");
  
  // DEVELOPER BYPASS
  if (session.user.id.startsWith("dummy-")) {
    const dummyRole = session.user.id.split("-")[1] as HanbeeRole;
    return {
      id: session.user.id,
      email: session.user.email || `${dummyRole}@hanbee.in`,
      username: null,
      full_name: session.user.user_metadata?.full_name || `Dummy ${dummyRole}`,
      role: dummyRole,
      avatar_url: null
    };
  }

  const profiles = await authenticatedSupabaseFetch<AccountProfile[]>(
    `/rest/v1/profiles?select=id,email,username,full_name,role,avatar_url&id=eq.${encodeURIComponent(session.user.id)}`,
  );
  const profile = profiles[0];
  if (!profile) throw new Error("We couldn't find your Hanbee profile.");
  return profile;
}

export async function updateAccountProfile(input: Pick<AccountProfile, "id"> & { full_name: string }) {
  if (input.id.startsWith("dummy-")) {
    const session = readStoredSession();
    if (session) {
      session.user.user_metadata = session.user.user_metadata || {};
      session.user.user_metadata.full_name = input.full_name.trim();
      writeStoredSession(session);
    }
    return;
  }
  return authenticatedSupabaseFetch<undefined>(`/rest/v1/profiles?id=eq.${encodeURIComponent(input.id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ full_name: input.full_name.trim() }),
  });
}

// --- Two-factor authentication (TOTP), via Supabase Auth's built-in MFA API ---

export interface MfaFactor {
  id: string;
  friendly_name?: string;
  factor_type: "totp";
  status: "verified" | "unverified";
}

// GoTrue has no GET /auth/v1/factors list endpoint; enrolled factors come
// back on the user object from GET /auth/v1/user.
export async function listMfaFactors() {
  const user = await authenticatedSupabaseFetch<{ factors?: MfaFactor[] }>("/auth/v1/user");
  return (user.factors ?? []).filter((f) => f.factor_type === "totp");
}

export async function enrollMfaFactor() {
  // Returns a QR code (as an SVG string) and the TOTP secret for manual entry.
  return authenticatedSupabaseFetch<{ id: string; totp: { qr_code: string; secret: string; uri: string } }>(
    "/auth/v1/factors",
    { method: "POST", body: JSON.stringify({ factor_type: "totp" }) },
  );
}

export async function challengeMfaFactor(factorId: string, accessToken?: string) {
  const path = `/auth/v1/factors/${encodeURIComponent(factorId)}/challenge`;
  if (accessToken) {
    return supabaseFetch<{ id: string }>(path, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }
  return authenticatedSupabaseFetch<{ id: string }>(path, { method: "POST" });
}

export async function verifyMfaFactor(
  factorId: string,
  challengeId: string,
  code: string,
  accessToken?: string,
): Promise<AuthSessionResponse> {
  const path = `/auth/v1/factors/${encodeURIComponent(factorId)}/verify`;
  const body = JSON.stringify({ challenge_id: challengeId, code: code.trim() });
  if (accessToken) {
    return supabaseFetch<AuthSessionResponse>(path, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body,
    });
  }
  return authenticatedSupabaseFetch<AuthSessionResponse>(path, { method: "POST", body });
}

export async function unenrollMfaFactor(factorId: string) {
  return authenticatedSupabaseFetch<undefined>(`/auth/v1/factors/${encodeURIComponent(factorId)}`, {
    method: "DELETE",
  });
}

export function toSupabaseSession(auth: AuthSessionResponse): SupabaseSession {
  return {
    access_token: auth.access_token,
    refresh_token: auth.refresh_token,
    token_type: auth.token_type,
    user: auth.user,
    ...(auth.expires_in ? { expires_at: Math.floor(Date.now() / 1000) + auth.expires_in } : {}),
  };
}
