export function publicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || !key.startsWith("sb_publishable_")) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password)
      return null;
    return { url: parsed.origin, key };
  } catch {
    return null;
  }
}
export function requirePublicConfig() {
  const config = publicConfig();
  if (!config) throw new Error("SUPABASE_CONFIGURATION_MISSING");
  return config;
}
