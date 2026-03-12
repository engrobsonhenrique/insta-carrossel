"use client";

import { useAuth } from "./AuthProvider";
import { LoginLink, LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components";

export default function AuthButton() {
  const { user, loading } = useAuth();

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
        <LogoutLink className="text-xs text-zinc-500 hover:text-red-400 transition-colors">
          Sair
        </LogoutLink>
      </div>
    );
  }

  return (
    <LoginLink className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-2 rounded-lg text-sm transition-colors">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" />
      </svg>
      Entrar
    </LoginLink>
  );
}
