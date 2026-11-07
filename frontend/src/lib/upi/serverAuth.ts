// Resolves the calling user's identity from their Supabase access token,
// inside a Next.js API route -- mirrors the same /auth/v1/user call
// frontend/src/lib/supabaseAuth.ts's getCurrentAccount uses client-side,
// since these routes run server-side and can't reuse that browser-facing
// module directly.
function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set.`);
  return v;
}

export async function resolveUserFromRequest(req: Request): Promise<{ id: string; email?: string } | null> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice("Bearer ".length);
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL").replace(/\/$/, "");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const res = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json() as Promise<{ id: string; email?: string }>;
}
