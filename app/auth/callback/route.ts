import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Safari does not reliably persist the chunked `sb-*-auth-token.0/.1/...`
// session cookies when they're carried as Set-Cookie headers on the same
// 3xx response that also sends a Location header (observed: Chrome keeps
// the session, Safari discards it and the very next request is
// unauthenticated). Returning 200 HTML with a client-side navigation gives
// Safari a normal response to commit every chunk before it issues the next
// request.
function redirectAfterCookiesAreSet(url: URL) {
  return new NextResponse(
    `<!doctype html><meta http-equiv="refresh" content="0;url=${url.toString()}">`,
    { headers: { "content-type": "text/html; charset=utf-8" } }
  );
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirectTo") ?? "/historial";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return redirectAfterCookiesAreSet(new URL(redirectTo, origin));
    }
  }

  return redirectAfterCookiesAreSet(new URL("/?error=auth", origin));
}
