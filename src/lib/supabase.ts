import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const looksLikePlaceholder =
  !supabaseUrl ||
  !supabaseAnonKey ||
  supabaseUrl.includes("<") ||
  supabaseUrl.includes("project-ref") ||
  supabaseAnonKey.startsWith("eyJ...");

export const supabaseReady = !looksLikePlaceholder;

export const supabase = supabaseReady
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
