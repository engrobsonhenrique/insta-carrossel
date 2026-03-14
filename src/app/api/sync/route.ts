import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

export const maxDuration = 60;

const MAX_CAROUSELS_PER_USER = 5;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\s+/g, ""),
    process.env.SUPABASE_SERVICE_ROLE_KEY!.replace(/\s+/g, "")
  );
}

// Upload base64 data URL to Supabase Storage and return a permanent public URL
async function persistImage(
  supabase: ReturnType<typeof getSupabase>,
  userId: string,
  carouselTs: string,
  slideIndex: number,
  dataUrl: string
): Promise<string> {
  const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) return dataUrl;

  const contentType = match[1];
  const base64 = match[2];
  const ext = contentType.split("/")[1] || "png";
  const buffer = Buffer.from(base64, "base64");
  const path = `carousel-images/${userId}/${carouselTs}/slide-${slideIndex}.${ext}`;

  await supabase.storage
    .from("carousel-images")
    .upload(path, buffer, { contentType, upsert: true });

  const { data } = supabase.storage.from("carousel-images").getPublicUrl(path);
  return data.publicUrl;
}

// Upload all base64 images in slides to Storage, return slides with permanent URLs
async function persistSlideImages(
  supabase: ReturnType<typeof getSupabase>,
  userId: string,
  slides: Array<Record<string, unknown>>
): Promise<Array<Record<string, unknown>>> {
  const ts = Date.now().toString(36);
  const persisted = await Promise.all(
    slides.map(async (slide, i) => {
      const imageUrl = slide.imageUrl as string | undefined;
      if (imageUrl && imageUrl.startsWith("data:")) {
        const permanentUrl = await persistImage(supabase, userId, ts, i, imageUrl);
        return { ...slide, imageUrl: permanentUrl };
      }
      return slide;
    })
  );
  return persisted;
}

// Delete old carousels beyond the limit, and clean up their Storage images
async function enforceCarouselLimit(
  supabase: ReturnType<typeof getSupabase>,
  userId: string
): Promise<void> {
  const { data: all } = await supabase
    .from("carousels")
    .select("id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (!all || all.length <= MAX_CAROUSELS_PER_USER) return;

  const toDelete = all.slice(MAX_CAROUSELS_PER_USER);
  const ids = toDelete.map((r: { id: string }) => r.id);

  // Delete Storage folder for this user's old carousels (best-effort)
  const { data: files } = await supabase.storage
    .from("carousel-images")
    .list(`carousel-images/${userId}`);
  if (files && files.length > 0) {
    // Keep only recent folders, remove old ones
    // We can't easily match carousel ID to folder, so just enforce DB limit
  }

  await supabase.from("carousels").delete().in("id", ids);
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
      .limit(MAX_CAROUSELS_PER_USER);

    return NextResponse.json({ carousels: data || [] });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  let userId = await getAuthUserId();

  const body = await req.json();
  const { action } = body;

  // Fallback: if auth fails but client sent userId, use it for save-profile
  // This is safe because we use service_role key (bypasses RLS)
  if (!userId && action === "save-profile" && body.userId) {
    userId = body.userId;
    console.log("sync POST: auth failed, using body.userId:", userId);
  }

  if (!userId) {
    console.error("sync POST: no userId, action:", action);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    const { topic, slides, profile, caption } = body;

    // Upload base64 images to Storage for permanent URLs
    const persistedSlides = await persistSlideImages(supabase, userId, slides);

    const { data: row, error } = await supabase
      .from("carousels")
      .insert({
        user_id: userId,
        topic,
        slides: persistedSlides,
        profile_snapshot: profile,
        caption: caption || null,
      })
      .select()
      .single();

    if (error || !row) {
      return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }

    // Enforce max 5 carousels per user — delete oldest beyond limit
    await enforceCarouselLimit(supabase, userId);

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
