"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { requirePublicConfig } from "./env";
export function createClient() {
  const { url, key } = requirePublicConfig();
  return createBrowserClient<Database>(url, key);
}
