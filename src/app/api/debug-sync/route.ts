import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\s+/g, ""),
    process.env.SUPABASE_SERVICE_ROLE_KEY!.replace(/\s+/g, "")
  );
}

export async function GET() {
  const steps: Record<string, unknown> = {};

  // Step 1: Check env vars
  const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  steps.envKeyLength = rawKey.length;
  steps.envKeyHasSpace = /\s/.test(rawKey);
  steps.cleanKeyLength = rawKey.replace(/\s+/g, "").length;

  // Step 2: Check auth
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();
    steps.authUserId = user?.id ?? "NO USER";
  } catch (e: unknown) {
    steps.authError = e instanceof Error ? e.message : String(e);
  }

  // Step 3: Read profiles
  try {
    const supabase = getSupabase();
    const { data: profiles, error: readError } = await supabase
      .from("profiles")
      .select("id, display_name, profiles_data, updated_at");

    if (readError) {
      steps.readError = readError.message;
    } else {
      steps.profileCount = profiles?.length ?? 0;
      steps.profiles = profiles?.map((p) => ({
        id: p.id,
        name: p.display_name,
        hasProfilesData: !!p.profiles_data,
        profilesDataKeys: p.profiles_data ? Object.keys(p.profiles_data) : null,
        profileCount: p.profiles_data?.profiles?.length ?? 0,
        updatedAt: p.updated_at,
      }));
    }
  } catch (e: unknown) {
    steps.supabaseError = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json(steps, {
    headers: { "Cache-Control": "no-store" },
  });
}

// POST: simulate exact save-profile flow with detailed logging
export async function POST(req: NextRequest) {
  const log: Record<string, unknown> = {};

  // Step 1: Auth check
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();
    log.userId = user?.id ?? "NO USER";
    if (!user?.id) {
      return NextResponse.json({ ...log, finalError: "AUTH FAILED - no user" }, { status: 200 });
    }

    const userId = user.id;

    // Step 2: Parse body
    const body = await req.json();
    log.bodyKeys = Object.keys(body);
    log.hasProfile = !!body.profile;
    log.hasProfilesData = !!body.profilesData;
    log.profilesDataProfileCount = body.profilesData?.profiles?.length ?? 0;

    if (!body.profile) {
      return NextResponse.json({ ...log, finalError: "NO PROFILE IN BODY" }, { status: 200 });
    }

    // Step 3: Build upsert data (same logic as sync route)
    const { profile, profilesData } = body;
    const headshotUrl = profile.headshotUrl && profile.headshotUrl.startsWith("data:")
      ? null
      : profile.headshotUrl;
    const upsertData: Record<string, unknown> = {
      id: userId,
      display_name: profile.displayName,
      handle: profile.handle,
      verified: profile.verified,
      headshot_url: headshotUrl,
      theme: profile.theme,
      persona: profile.persona || "",
      palette_id: profile.paletteId || null,
    };
    if (profilesData) {
      upsertData.profiles_data = profilesData;
    }

    log.upsertDataKeys = Object.keys(upsertData);
    log.hasProfilesDataInUpsert = "profiles_data" in upsertData;

    // Step 4: Execute upsert
    const supabase = getSupabase();
    const { error } = await supabase.from("profiles").upsert(upsertData);
    if (error) {
      log.upsertError = error.message;
      log.upsertCode = error.code;
      log.upsertDetails = error.details;
      return NextResponse.json({ ...log, finalError: "UPSERT FAILED" }, { status: 200 });
    }

    // Step 5: Verify write
    const { data: verify } = await supabase
      .from("profiles")
      .select("profiles_data, updated_at")
      .eq("id", userId)
      .single();

    log.verifyHasProfilesData = !!verify?.profiles_data;
    log.verifyProfileCount = verify?.profiles_data?.profiles?.length ?? 0;
    log.verifyUpdatedAt = verify?.updated_at;
    log.success = true;

    return NextResponse.json(log, { status: 200 });
  } catch (e: unknown) {
    log.fatalError = e instanceof Error ? e.message : String(e);
    return NextResponse.json(log, { status: 200 });
  }
}
