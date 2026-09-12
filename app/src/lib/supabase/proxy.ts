import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import { publicConfig } from "./env";
import { isProtectedPath, safeNext } from "@/lib/utils/redirects";
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const env = publicConfig();
  let authenticated = false;
  if (env) {
    const supabase = createServerClient<Database>(env.url, env.key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(values, headers) {
          values.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          values.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers ?? {}).forEach(([name, value]) =>
            response.headers.set(name, value),
          );
        },
      },
    });
    const { data, error } = await supabase.auth.getClaims();
    authenticated = !error && !!data?.claims?.sub;
  }
  if (!authenticated && isProtectedPath(request.nextUrl.pathname)) {
    const target = request.nextUrl.clone();
    target.pathname = "/login";
    target.search = "";
    target.searchParams.set("next", safeNext(request.nextUrl.pathname));
    const redirected = NextResponse.redirect(target);
    response.cookies
      .getAll()
      .forEach((cookie) => redirected.cookies.set(cookie));
    response = redirected;
  }
  // No shared cache for pages, redirects or RSC payloads that may set/read auth cookies.
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}
