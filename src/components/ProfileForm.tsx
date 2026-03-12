"use client";

import { ProfileConfig } from "@/lib/types";

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

      {/* Theme */}
      <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
        <h3 className="text-sm font-medium text-zinc-400 mb-3">
          Tema do Carrossel
        </h3>
        <div className="flex gap-3">
          <button
            onClick={() => onChange({ ...profile, theme: "dark" })}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              profile.theme === "dark"
                ? "bg-blue-500 text-white"
                : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
            }`}
          >
            Escuro
          </button>
          <button
            onClick={() => onChange({ ...profile, theme: "light" })}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              profile.theme === "light"
                ? "bg-blue-500 text-white"
                : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
            }`}
          >
            Claro
          </button>
        </div>
      </div>
    </div>
  );
}
