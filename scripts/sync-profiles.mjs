import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

// Parse .env.local manually
const envFile = readFileSync(".env.local", "utf-8");
for (const line of envFile.split("\n")) {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data: profiles } = await supabase.from("profiles").select("*");

for (const p of profiles) {
  console.log(`User: ${p.id} | ${p.display_name} @${p.handle}`);
  console.log(`  profiles_data: ${p.profiles_data ? "HAS DATA" : "NULL"}`);

  if (!p.profiles_data) {
    // Build a ProfileStore from flat fields
    const store = {
      profiles: [
        {
          id: p.id,
          displayName: p.display_name,
          handle: p.handle,
          verified: p.verified,
          headshotUrl:
            p.headshot_url && p.headshot_url.startsWith("data:")
              ? null
              : p.headshot_url,
          theme: p.theme,
          persona: p.persona || "",
          paletteId: p.palette_id || "por-do-sol",
        },
      ],
      activeProfileId: p.id,
    };

    const { error } = await supabase
      .from("profiles")
      .update({ profiles_data: store })
      .eq("id", p.id);

    if (error) {
      console.log(`  ERROR writing: ${error.message}`);
    } else {
      console.log(`  MIGRATED to profiles_data`);
    }
  }
}

console.log("\nDone.");
