import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sid = url.searchParams.get("sid");

  if (!sid) return NextResponse.json({ error: "Missing sid" });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from("nova_sessions")
    .select("*")
    .eq("id", sid)
    .maybeSingle();

  return NextResponse.json({ data, error });
}
