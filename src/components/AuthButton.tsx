"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { createClient } from "@/lib/supabase/client";

export default function AuthButton() {
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleLogin = async () => {
    if (!email.trim()) return;
    setSending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setSending(false);
    if (!error) {
      setSent(true);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="w-8 h-8 rounded-full bg-zinc-800 animate-pulse" />
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
          {(user.email || "U")[0].toUpperCase()}
        </div>
        <span className="text-sm text-zinc-400 hidden sm:block max-w-32 truncate">
          {user.email}
        </span>
        <button
          onClick={handleLogout}
          className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
        >
          Sair
        </button>
      </div>
    );
  }

  if (sent) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-400">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        Verifique seu email!
        <button
          onClick={() => { setSent(false); setShowInput(false); }}
          className="text-xs text-zinc-500 hover:text-white"
        >
          Voltar
        </button>
      </div>
    );
  }

  if (showInput) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          placeholder="seu@email.com"
          className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 w-48"
          autoFocus
        />
        <button
          onClick={handleLogin}
          disabled={sending || !email.trim()}
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 text-white px-3 py-1.5 rounded-lg text-sm transition-colors whitespace-nowrap"
        >
          {sending ? "Enviando..." : "Enviar"}
        </button>
        <button
          onClick={() => setShowInput(false)}
          className="text-zinc-500 hover:text-white text-sm"
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowInput(true)}
      className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-2 rounded-lg text-sm transition-colors"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M22 4l-10 8L2 4" />
      </svg>
      Entrar
    </button>
  );
}
