import { ColorPalette, CustomPalette } from "./types";

export const PALETTES: ColorPalette[] = [
  {
    id: "twitter-dark",
    name: "Twitter Escuro",
    bg: "#15202b",
    text: "#e7e9ea",
    secondary: "#8b98a5",
    divider: "#38444d",
    accent: "#1d9bf0",
    avatarBg: "#38444d",
  },
  {
    id: "twitter-light",
    name: "Twitter Claro",
    bg: "#ffffff",
    text: "#0f1419",
    secondary: "#536471",
    divider: "#eff3f4",
    accent: "#1d9bf0",
    avatarBg: "#cfd9de",
  },
  {
    id: "oceano",
    name: "Oceano",
    bg: "#0a1628",
    text: "#e0eafc",
    secondary: "#7b93b0",
    divider: "#1a2d4a",
    accent: "#38bdf8",
    avatarBg: "#1a2d4a",
  },
  {
    id: "floresta",
    name: "Floresta",
    bg: "#0f1f14",
    text: "#d8eed8",
    secondary: "#7aab7a",
    divider: "#1e3a24",
    accent: "#4ade80",
    avatarBg: "#1e3a24",
  },
  {
    id: "por-do-sol",
    name: "Por do Sol",
    bg: "#1a0f0a",
    text: "#fde8d8",
    secondary: "#c08a6a",
    divider: "#3a2418",
    accent: "#fb923c",
    avatarBg: "#3a2418",
  },
  {
    id: "meia-noite",
    name: "Meia-Noite",
    bg: "#0a0a14",
    text: "#e0e0f0",
    secondary: "#8888aa",
    divider: "#1a1a2e",
    accent: "#a78bfa",
    avatarBg: "#1a1a2e",
  },
];

export function getPalette(
  paletteId?: string,
  theme?: "light" | "dark",
  customPalette?: CustomPalette
): ColorPalette {
  if (paletteId === "custom" && customPalette) {
    return {
      id: "custom",
      name: "Personalizado",
      bg: customPalette.bg,
      text: customPalette.text,
      secondary: customPalette.secondary,
      divider: customPalette.bg === "#ffffff" || customPalette.bg === "#fff"
        ? "#e5e7eb"
        : adjustBrightness(customPalette.bg, 20),
      accent: customPalette.accent,
      avatarBg: adjustBrightness(customPalette.bg, 15),
    };
  }
  if (paletteId) {
    const found = PALETTES.find((p) => p.id === paletteId);
    if (found) return found;
  }
  // Fallback to Twitter dark/light based on theme
  return theme === "light" ? PALETTES[1] : PALETTES[0];
}

// Helper to lighten/darken a hex color
function adjustBrightness(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
