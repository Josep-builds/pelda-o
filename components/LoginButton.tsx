"use client";

import { createClient } from "@/lib/supabase/client";

export function LoginButton({ redirectTo }: { redirectTo?: string }) {
  async function handleLogin() {
    const supabase = createClient();
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    if (redirectTo) callbackUrl.searchParams.set("redirectTo", redirectTo);

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl.toString() },
    });
  }

  return (
    <button
      onClick={handleLogin}
      className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1E3A5F] px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-[#15293f]"
    >
      Entrar con Google
    </button>
  );
}
