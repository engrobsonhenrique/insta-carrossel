"use client";

import { createContext, useContext } from "react";
import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs";

interface AuthContextType {
  user: { id: string; email: string | null } | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user: kindeUser, isLoading } = useKindeBrowserClient();

  const user = kindeUser
    ? { id: kindeUser.id, email: kindeUser.email ?? null }
    : null;

  return (
    <AuthContext.Provider value={{ user, loading: isLoading ?? false }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
