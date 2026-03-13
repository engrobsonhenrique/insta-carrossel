import { SupabaseClient } from "@supabase/supabase-js";
import { ProfileConfig, SlideData, CarouselHistoryItem } from "../types";

export async function loadProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<{ profile: ProfileConfig } | null> {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (!data) return null;

  return {
    profile: {
      displayName: data.display_name,
      handle: data.handle,
      verified: data.verified,
      headshotUrl: data.headshot_url,
      theme: data.theme,
      persona: data.persona || "",
      paletteId: data.palette_id || undefined,
    },
  };
}

export async function saveProfile(
  supabase: SupabaseClient,
  userId: string,
  profile: ProfileConfig
): Promise<void> {
  await supabase.from("profiles").upsert({
    id: userId,
    display_name: profile.displayName,
    handle: profile.handle,
    verified: profile.verified,
    headshot_url: profile.headshotUrl,
    theme: profile.theme,
    persona: profile.persona || "",
    palette_id: profile.paletteId || null,
  });
}

export async function loadCarousels(
  supabase: SupabaseClient,
  userId: string
): Promise<CarouselHistoryItem[]> {
  const { data } = await supabase
    .from("carousels")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (!data) return [];

  return data.map((row) => ({
    id: row.id,
    topic: row.topic,
    slides: row.slides as SlideData[],
    profile: row.profile_snapshot as ProfileConfig,
    createdAt: row.created_at,
  }));
}

export async function saveCarousel(
  supabase: SupabaseClient,
  userId: string,
  data: { topic: string; slides: SlideData[]; profile: ProfileConfig }
): Promise<CarouselHistoryItem | null> {
  const { data: row, error } = await supabase
    .from("carousels")
    .insert({
      user_id: userId,
      topic: data.topic,
      slides: data.slides,
      profile_snapshot: data.profile,
    })
    .select()
    .single();

  if (error || !row) return null;

  return {
    id: row.id,
    topic: row.topic,
    slides: row.slides as SlideData[],
    profile: row.profile_snapshot as ProfileConfig,
    createdAt: row.created_at,
  };
}

export async function deleteCarousel(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  await supabase.from("carousels").delete().eq("id", id);
}

export async function clearCarousels(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  await supabase.from("carousels").delete().eq("user_id", userId);
}
