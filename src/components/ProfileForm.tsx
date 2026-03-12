"use client";

import { ProfileConfig } from "@/lib/types";

interface ProfileFormProps {
  profile: ProfileConfig;
  onChange: (profile: ProfileConfig) => void;
  geminiKey: string;
  onGeminiKeyChange: (key: string) => void;
  unsplashKey: string;
  onUnsplashKeyChange: (key: string) => void;
}

export default function ProfileForm({
  profile,
  onChange,
  geminiKey,
  onGeminiKeyChange,
  unsplashKey,
  onUnsplashKeyChange,
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

      {/* API Keys */}
      <div className="space-y-3 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
        <h3 className="text-sm font-medium text-zinc-400">API Keys</h3>
        <div>
          <label className="block text-sm text-zinc-400 mb-1">
            Gemini API Key
          </label>
          <input
            type="password"
            value={geminiKey}
            onChange={(e) => onGeminiKeyChange(e.target.value)}
            placeholder="AIza..."
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500"
          />
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:underline mt-1 inline-block"
          >
            Pegar chave grátis
          </a>
        </div>
        <div>
          <label className="block text-sm text-zinc-400 mb-1">
            Unsplash Access Key
          </label>
          <input
            type="password"
            value={unsplashKey}
            onChange={(e) => onUnsplashKeyChange(e.target.value)}
            placeholder="Access Key"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500"
          />
          <a
            href="https://unsplash.com/developers"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:underline mt-1 inline-block"
          >
            Criar app grátis
          </a>
        </div>
      </div>

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
