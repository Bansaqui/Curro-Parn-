import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import { requirePublicConfig } from "./env";
export async function createClient() {
  const { url, key } = requirePublicConfig();
  const store = await cookies();
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(values) {
        try {
          values.forEach(({ name, value, options }) =>
            store.set(name, value, options),
          );
        } catch {
          // Server Components cannot set cookies. Proxy refreshes and sends them.
          // Server Actions and Route Handlers use this same adapter with writable cookies.
        }
      },
    },
  });
}
