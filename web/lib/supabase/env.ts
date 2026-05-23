/** Client-safe Supabase env (anon or publishable key). */
export function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
}

export function getSupabaseAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    ""
  );
}

export function hasSupabaseClientEnv(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}
