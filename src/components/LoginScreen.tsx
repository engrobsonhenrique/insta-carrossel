"use client";

import { LoginLink, RegisterLink } from "@kinde-oss/kinde-auth-nextjs/components";

export default function LoginScreen() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8 text-center">
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
            Gere carrosseis de Instagram com IA v2
          </p>
        </div>

        <div className="space-y-3">
          <LoginLink className="block w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-medium transition-colors text-center">
            Entrar
          </LoginLink>
          <RegisterLink className="block w-full bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-xl font-medium transition-colors text-center">
            Criar conta
          </RegisterLink>
        </div>
      </div>
    </div>
  );
}
