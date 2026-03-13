"use client";

import { ProfileConfig } from "@/lib/types";
import { PALETTES } from "@/lib/palettes";

interface ProfileFormProps {
  profile: ProfileConfig;
  onChange: (profile: ProfileConfig) => void;
}

export default function ProfileForm({
  profile,
  onChange,
}: ProfileFormProps) {
  const handleHeadshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange({ ...profile, headshotUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const currentPaletteId = profile.paletteId || (profile.theme === "light" ? "twitter-light" : "twitter-dark");

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white">Configurações</h2>

      {/* Profile */}
      <div className="space-y-3 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
        <h3 className="text-sm font-medium text-zinc-400">Perfil</h3>
        <div>
          <label className="block text-sm text-zinc-400 mb-1">Nome</label>
          <input
            type="text"
            value={profile.displayName}
            onChange={(e) =>
              onChange({ ...profile, displayName: e.target.value })
            }
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm text-zinc-400 mb-1">@handle</label>
          <input
            type="text"
            value={profile.handle}
            onChange={(e) => onChange({ ...profile, handle: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
            <input
              type="checkbox"
              checked={profile.verified}
              onChange={(e) =>
                onChange({ ...profile, verified: e.target.checked })
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
          Descreva seu estilo, público-alvo e tom de voz. O carrossel será adaptado à sua persona.
        </p>
        <textarea
          value={profile.persona || ""}
          onChange={(e) =>
            onChange({ ...profile, persona: e.target.value })
          }
          placeholder="Ex: Sou um coach de finanças pessoais. Meu público são jovens de 20-35 anos. Uso tom direto, motivacional e com linguagem simples. Gosto de usar dados e exemplos do dia a dia."
          rows={4}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 resize-none"
        />
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
                onChange({
                  ...profile,
                  paletteId: palette.id,
                  theme: palette.id === "twitter-light" ? "light" : "dark",
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
                  style={{ backgroundColor: palette.bg, border: "1px solid rgba(255,255,255,0.1)" }}
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
    </div>
  );
}
