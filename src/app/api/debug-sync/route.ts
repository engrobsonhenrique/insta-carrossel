import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

export async function GET() {
  const steps: Record<string, unknown> = {};

  // Step 1: Check env vars exist
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  steps.envUrl = rawUrl ? `${rawUrl.slice(0, 20)}...` : "MISSING";
  steps.envKeyLength = rawKey.length;
  steps.envKeyHasSpace = /\s/.test(rawKey);
  steps.envKeyFirst10 = rawKey.slice(0, 10);
  steps.envKeyLast10 = rawKey.slice(-10);

  // Step 2: Check auth
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();
    steps.authUserId = user?.id ?? "NO USER";
    steps.authEmail = user?.email ?? "NO EMAIL";
  } catch (e: unknown) {
    steps.authError = e instanceof Error ? e.message : String(e);
  }

  // Step 3: Try Supabase connection
  const cleanUrl = rawUrl.replace(/\s+/g, "");
  const cleanKey = rawKey.replace(/\s+/g, "");
  steps.cleanKeyLength = cleanKey.length;
  steps.cleanKeyFirst10 = cleanKey.slice(0, 10);

  try {
    const supabase = createClient(cleanUrl, cleanKey);

    // Step 4: Try to read profiles
    const { data: profiles, error: readError } = await supabase
      .from("profiles")
      .select("id, display_name, profiles_data, updated_at");

    if (readError) {
      steps.readError = readError.message;
    } else {
      steps.profileCount = profiles?.length ?? 0;
      steps.profiles = profiles?.map((p) => ({
        id: p.id?.slice(0, 10) + "...",
        name: p.display_name,
        hasProfilesData: !!p.profiles_data,
        updatedAt: p.updated_at,
      }));
    }

    // Step 5: Try a test write (update updated_at on first profile)
    if (profiles && profiles.length > 0) {
      const testId = profiles[0].id;
      const { error: writeError } = await supabase
        .from("profiles")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", testId);

      steps.writeTest = writeError ? `FAILED: ${writeError.message}` : "SUCCESS";
    }
  } catch (e: unknown) {
    steps.supabaseError = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json(steps, {
    headers: { "Cache-Control": "no-store" },
  });
}
