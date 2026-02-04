import { supabase } from "./supabase";

export function handleFromEmail(email: string) {
  const base = email.split("@")[0] || "user";
  return base.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 20) || "user";
}

export async function ensureProfile(userId: string, email: string | null) {
  const handle = handleFromEmail(email || "user@newvybe.com");

  const { data: existing, error: selErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (selErr) throw selErr;

  if (!existing) {
    const { error: insErr } = await supabase.from("profiles").insert({
      id: userId,
      handle,
    });
    if (insErr) throw insErr;
    return handle;
  }

  return existing.handle as string;
}
