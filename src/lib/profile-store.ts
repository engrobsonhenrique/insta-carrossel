import { ProfileConfig, ProfileStore } from "./types";

const STORAGE_KEY = "insta-carrossel-profiles";
const LEGACY_KEY = "insta-carrossel-config";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function createDefaultProfile(): ProfileConfig {
  return {
    id: generateId(),
    displayName: "Meu Perfil",
    handle: "meu.perfil",
    verified: false,
    headshotUrl: null,
    theme: "dark",
    persona: "",
    paletteId: "por-do-sol",
  };
}

export function loadProfileStore(): ProfileStore {
  if (typeof window === "undefined") {
    const def = createDefaultProfile();
    return { profiles: [def], activeProfileId: def.id };
  }

  // Try new format first
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const store = JSON.parse(stored) as ProfileStore;
      if (store.profiles?.length > 0) return store;
    } catch { /* fall through */ }
  }

  // Try legacy format migration
  const legacy = localStorage.getItem(LEGACY_KEY);
  if (legacy) {
    try {
      const data = JSON.parse(legacy);
      const oldProfile = data.profile || data;
      const profile: ProfileConfig = {
        id: generateId(),
        displayName: oldProfile.displayName || "Meu Perfil",
        handle: oldProfile.handle || "meu.perfil",
        verified: oldProfile.verified ?? false,
        headshotUrl: oldProfile.headshotUrl || null,
        theme: oldProfile.theme || "dark",
        persona: oldProfile.persona || "",
        paletteId: oldProfile.paletteId || "por-do-sol",
      };
      const store: ProfileStore = {
        profiles: [profile],
        activeProfileId: profile.id,
      };
      saveProfileStore(store);
      return store;
    } catch { /* fall through */ }
  }

  // Default
  const def = createDefaultProfile();
  const store: ProfileStore = { profiles: [def], activeProfileId: def.id };
  saveProfileStore(store);
  return store;
}

export function saveProfileStore(store: ProfileStore): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getActiveProfile(store: ProfileStore): ProfileConfig {
  const found = store.profiles.find(p => p.id === store.activeProfileId);
  return found || store.profiles[0];
}

export function addProfile(store: ProfileStore): ProfileStore {
  const newProfile = createDefaultProfile();
  newProfile.displayName = `Perfil ${store.profiles.length + 1}`;
  newProfile.handle = `perfil.${store.profiles.length + 1}`;
  return {
    profiles: [...store.profiles, newProfile],
    activeProfileId: newProfile.id,
  };
}

export function updateProfile(store: ProfileStore, updated: ProfileConfig): ProfileStore {
  return {
    ...store,
    profiles: store.profiles.map(p => p.id === updated.id ? updated : p),
  };
}

export function deleteProfile(store: ProfileStore, profileId: string): ProfileStore {
  if (store.profiles.length <= 1) return store;
  const remaining = store.profiles.filter(p => p.id !== profileId);
  const needSwitch = store.activeProfileId === profileId;
  return {
    profiles: remaining,
    activeProfileId: needSwitch ? remaining[0].id : store.activeProfileId,
  };
}

export function switchProfile(store: ProfileStore, profileId: string): ProfileStore {
  return { ...store, activeProfileId: profileId };
}

/** Strip sensitive Blotato keys for history snapshots */
export function sanitizeProfileForHistory(profile: ProfileConfig): ProfileConfig {
  const { blotatoApiKey, blotatoAccountId, ...safe } = profile;
  void blotatoApiKey;
  void blotatoAccountId;
  return safe as ProfileConfig;
}
