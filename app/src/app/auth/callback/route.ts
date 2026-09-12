import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/utils/redirects";
import { reportError } from "@/lib/utils/errors";
import { appOrigin } from "@/features/auth/origin";
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  let destination = "/auth/error";
  if (code) {
    try {
      const { error } = await (
        await createClient()
      ).auth.exchangeCodeForSession(code);
      if (error) reportError("auth.callback", error);
      else destination = safeNext(request.nextUrl.searchParams.get("next"));
    } catch (error) {
      reportError("auth.callback", error);
    }
  }
  return NextResponse.redirect(new URL(destination, appOrigin()), {
    headers: { "Cache-Control": "private, no-store" },
  });
}
