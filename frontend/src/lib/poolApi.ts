import { authenticatedSupabaseFetch } from "./supabaseAuth";

async function rpc<T>(functionName: string, args: Record<string, unknown>): Promise<T> {
  return authenticatedSupabaseFetch<T>(`/rest/v1/rpc/${functionName}`, {
    method: "POST",
    body: JSON.stringify(args),
  });
}

export function createIndependentInvite(fullName: string, email: string): Promise<string> {
  return rpc<string>("staff_create_independent_invite", {
    p_full_name: fullName.trim(),
    p_email: email.trim(),
  });
}
