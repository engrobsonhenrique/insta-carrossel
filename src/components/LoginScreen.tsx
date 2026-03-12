"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
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

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        {/* Logo */}
        <div>
          <div className="flex justify-center mb-4">
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="1.5"
            >
              <rect x="2" y="2" width="20" height="20" rx="3" />
              <path d="M7 2v20M17 2v20" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Insta Carrossel</h1>
          <p className="text-sm text-zinc-500 mt-2">
            Gere carrosséis de Instagram com IA
          </p>
        </div>

        {sent ? (
          /* Email sent confirmation */
          <div className="space-y-4">
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#4ade80"
                strokeWidth="2"
                className="mx-auto mb-3"
              >
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <p className="text-green-400 font-medium">
                Link enviado!
              </p>
              <p className="text-sm text-zinc-400 mt-1">
                Verifique seu email e clique no link para entrar.
              </p>
            </div>
            <button
              onClick={() => setSent(false)}
              className="text-sm text-zinc-500 hover:text-white transition-colors"
            >
              Tentar outro email
            </button>
          </div>
        ) : (
          /* Login form */
          <div className="space-y-4">
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="seu@email.com"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors text-center"
                autoFocus
              />
            </div>
            <button
              onClick={handleLogin}
              disabled={sending || !email.trim()}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white py-3 rounded-xl font-medium transition-colors"
            >
              {sending ? "Enviando..." : "Entrar com email"}
            </button>
            <p className="text-xs text-zinc-600">
              Enviaremos um link mágico para seu email. Sem senha!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
