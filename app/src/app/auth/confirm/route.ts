import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/utils/redirects";
import { reportError } from "@/lib/utils/errors";
import { appOrigin } from "@/features/auth/origin";
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  let destination = "/auth/error";
  if (
    tokenHash &&
    (type === "email" || type === "signup" || type === "recovery")
  ) {
    try {
      const { error } = await (
        await createClient()
      ).auth.verifyOtp({ token_hash: tokenHash, type });
      if (error) reportError("auth.confirm", error);
      else
        destination =
          type === "recovery"
            ? "/actualizar-password"
            : safeNext(request.nextUrl.searchParams.get("next"));
    } catch (error) {
      reportError("auth.confirm", error);
    }
  }
  return NextResponse.redirect(new URL(destination, appOrigin()), {
    headers: { "Cache-Control": "private, no-store" },
  });
}
