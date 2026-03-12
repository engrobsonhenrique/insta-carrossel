import { SupabaseClient } from "@supabase/supabase-js";
import { ProfileConfig, SlideData, CarouselHistoryItem } from "../types";

export async function loadProfile(
  supabase: SupabaseClient
): Promise<{
  profile: ProfileConfig;
  geminiKey: string;
  unsplashKey: string;
} | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!data) return null;

  return {
    profile: {
      displayName: data.display_name,
      handle: data.handle,
      verified: data.verified,
      headshotUrl: data.headshot_url,
      theme: data.theme,
    },
    geminiKey: data.gemini_key || "",
    unsplashKey: data.unsplash_key || "",
  };
}

export async function saveProfile(
  supabase: SupabaseClient,
  profile: ProfileConfig,
  geminiKey: string,
  unsplashKey: string
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("profiles").upsert({
    id: user.id,
    display_name: profile.displayName,
    handle: profile.handle,
    verified: profile.verified,
    headshot_url: profile.headshotUrl,
    theme: profile.theme,
    gemini_key: geminiKey,
    unsplash_key: unsplashKey,
  });
}

export async function loadCarousels(
  supabase: SupabaseClient
): Promise<CarouselHistoryItem[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("carousels")
    .select("*")
    .eq("user_id", user.id)
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
  data: { topic: string; slides: SlideData[]; profile: ProfileConfig }
): Promise<CarouselHistoryItem | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: row, error } = await supabase
    .from("carousels")
    .insert({
      user_id: user.id,
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
  supabase: SupabaseClient
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("carousels").delete().eq("user_id", user.id);
}
