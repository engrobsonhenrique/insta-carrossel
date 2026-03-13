import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\s+/g, ""),
    process.env.SUPABASE_SERVICE_ROLE_KEY!.replace(/\s+/g, "")
  );
}

async function getAuthUserId(): Promise<string | null> {
  const { getUser } = getKindeServerSession();
  const user = await getUser();
  return user?.id ?? null;
}

export async function GET(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const action = req.nextUrl.searchParams.get("action");
  const supabase = getSupabase();

  if (action === "load-profile") {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    return NextResponse.json({
      profile: data || null,
      profilesData: data?.profiles_data || null,
    });
  }

  if (action === "load-carousels") {
    const { data } = await supabase
      .from("carousels")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    return NextResponse.json({ carousels: data || [] });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { action } = body;
  const supabase = getSupabase();

  if (action === "save-profile") {
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
    const { error } = await supabase.from("profiles").upsert(upsertData);
    if (error) {
      console.error("save-profile error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "save-carousel") {
    const { topic, slides, profile } = body;
    const { data: row, error } = await supabase
      .from("carousels")
      .insert({
        user_id: userId,
        topic,
        slides,
        profile_snapshot: profile,
      })
      .select()
      .single();

    if (error || !row) {
      return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }
    return NextResponse.json({ carousel: row });
  }

  if (action === "delete-carousel") {
    const { id } = body;
    await supabase.from("carousels").delete().eq("id", id).eq("user_id", userId);
    return NextResponse.json({ ok: true });
  }

  if (action === "clear-carousels") {
    await supabase.from("carousels").delete().eq("user_id", userId);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
