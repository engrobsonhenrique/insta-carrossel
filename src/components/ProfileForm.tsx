"use client";

import { useState } from "react";
import { ProfileConfig, ProfileStore } from "@/lib/types";
import { PALETTES } from "@/lib/palettes";
import { getActiveProfile } from "@/lib/profile-store";

interface ProfileFormProps {
  store: ProfileStore;
  onProfileChange: (profile: ProfileConfig) => void;
  onProfileSwitch: (profileId: string) => void;
  onProfileCreate: () => void;
  onProfileDelete: (profileId: string) => void;
}

export default function ProfileForm({
  store,
  onProfileChange,
  onProfileSwitch,
  onProfileCreate,
  onProfileDelete,
}: ProfileFormProps) {
  const profile = getActiveProfile(store);
  const [editing, setEditing] = useState(false);

  const handleHeadshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onProfileChange({ ...profile, headshotUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const currentPaletteId =
    profile.paletteId ||
    (profile.theme === "light" ? "twitter-light" : "twitter-dark");

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white">Configurações</h2>

      {/* Profile Switcher + Compact View */}
      <div className="space-y-3 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-zinc-400">Perfis</h3>
          <button
            onClick={onProfileCreate}
            className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 rounded-lg transition-colors"
          >
            + Novo
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {store.profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => onProfileSwitch(p.id)}
              className={`group relative flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors text-sm ${
                p.id === store.activeProfileId
                  ? "border-blue-500 bg-blue-500/10 text-white"
                  : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500"
              }`}
            >
              {p.headshotUrl ? (
                <img
                  src={p.headshotUrl}
                  alt=""
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] text-zinc-400">
                  {p.displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="max-w-[100px] truncate">{p.displayName}</span>
              {store.profiles.length > 1 && p.id === store.activeProfileId && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onProfileDelete(p.id);
                  }}
                  className="ml-1 text-zinc-500 hover:text-red-400 transition-colors"
                  title="Remover perfil"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </button>
          ))}
        </div>

        {/* Compact: active profile summary + edit button */}
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-700 hover:border-zinc-600 transition-colors text-left"
          >
            <div className="flex items-center gap-3 min-w-0">
              {profile.headshotUrl ? (
                <img
                  src={profile.headshotUrl}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-sm text-zinc-400 flex-shrink-0">
                  {profile.displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm text-white truncate">
                  {profile.displayName}
                  {profile.verified && (
                    <span className="text-blue-400 ml-1">✓</span>
                  )}
                </p>
                <p className="text-xs text-zinc-500 truncate">
                  @{profile.handle}
                  {profile.persona ? " · Persona configurada" : ""}
                  {profile.blotatoApiKey ? " · Blotato ✓" : ""}
                </p>
              </div>
            </div>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-zinc-500 flex-shrink-0"
            >
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        )}
      </div>

      {/* Expanded editing form */}
      {editing && (
        <>
          {/* Profile Fields */}
          <div className="space-y-3 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-zinc-400">Perfil</h3>
              <button
                onClick={() => setEditing(false)}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Fechar
              </button>
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Nome</label>
              <input
                type="text"
                value={profile.displayName}
                onChange={(e) =>
                  onProfileChange({ ...profile, displayName: e.target.value })
                }
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                @handle
              </label>
              <input
                type="text"
                value={profile.handle}
                onChange={(e) =>
                  onProfileChange({ ...profile, handle: e.target.value })
                }
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.verified}
                  onChange={(e) =>
                    onProfileChange({
                      ...profile,
                      verified: e.target.checked,
                    })
                  }
                  className="accent-blue-500"
                />
                Verificado
              </label>
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                Foto de perfil
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleHeadshotUpload}
                className="w-full text-sm text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-zinc-700 file:text-white hover:file:bg-zinc-600 file:cursor-pointer"
              />
            </div>
          </div>

          {/* Persona */}
          <div className="space-y-3 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
            <h3 className="text-sm font-medium text-zinc-400">Persona</h3>
            <p className="text-xs text-zinc-500">
              Descreva seu estilo, público-alvo e tom de voz. O carrossel será
              adaptado à sua persona.
            </p>
            <textarea
              value={profile.persona || ""}
              onChange={(e) =>
                onProfileChange({ ...profile, persona: e.target.value })
              }
              placeholder="Ex: Sou um coach de finanças pessoais. Meu público são jovens de 20-35 anos. Uso tom direto, motivacional e com linguagem simples."
              rows={4}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {/* Blotato Integration */}
          <div className="space-y-3 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
            <h3 className="text-sm font-medium text-zinc-400">
              Blotato (Instagram)
            </h3>
            <p className="text-xs text-zinc-500">
              Conecte o Blotato para postar e agendar direto no Instagram.
            </p>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                API Key
              </label>
              <input
                type="password"
                value={profile.blotatoApiKey || ""}
                onChange={(e) =>
                  onProfileChange({
                    ...profile,
                    blotatoApiKey: e.target.value,
                  })
                }
                placeholder="blt_..."
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">
                Account ID Instagram
              </label>
              <input
                type="text"
                value={profile.blotatoAccountId || ""}
                onChange={(e) =>
                  onProfileChange({
                    ...profile,
                    blotatoAccountId: e.target.value,
                  })
                }
                placeholder="ID da conta Instagram no Blotato"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Palette */}
          <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
            <h3 className="text-sm font-medium text-zinc-400 mb-3">
              Paleta de Cores
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {PALETTES.map((palette) => (
                <button
                  key={palette.id}
                  onClick={() =>
                    onProfileChange({
                      ...profile,
                      paletteId: palette.id,
                      theme:
                        palette.id === "twitter-light" ? "light" : "dark",
                    })
                  }
                  className={`relative flex flex-col items-center gap-1.5 p-2.5 rounded-lg border-2 transition-colors ${
                    currentPaletteId === palette.id
                      ? "border-blue-500 bg-zinc-700/50"
                      : "border-zinc-700/50 hover:border-zinc-600"
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <div
                      className="w-8 h-8 rounded-md"
                      style={{
                        backgroundColor: palette.bg,
                        border: "1px solid rgba(255,255,255,0.1)",
                      }}
                    />
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: palette.accent }}
                    />
                  </div>
                  <span className="text-[10px] text-zinc-400 leading-tight text-center">
                    {palette.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
