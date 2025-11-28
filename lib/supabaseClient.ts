"use client";

// CLIENT-SIDE SUPABASE (React Components)
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export const supabase = createClientComponentClient({
  cookies: {
    name: "sb-auth-token",
    lifetime: 60 * 60 * 24 * 7,
    path: "/",
    sameSite: "none",
    secure: true,
    domain: undefined, // important pour ngrok
  },
});
