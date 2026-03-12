export type GenerationMode = "rapido" | "avancado";

export type CTAType = "salvar" | "compartilhar" | "comentar" | "custom";

export interface AdvancedOptions {
  ctaType: CTAType;
  ctaCustomText?: string;
  usePasteText?: boolean;
  pasteOwnText?: string;
}

export interface ProfileConfig {
  displayName: string;
  handle: string;
  verified: boolean;
  headshotUrl: string | null;
  theme: "light" | "dark";
  persona?: string;
}

export interface TweetData {
  text: string;
  imageUrl?: string;
}

export interface SlideData {
  id: number;
  tweets: TweetData[];
  imageUrl?: string;
  isHook: boolean;
  isCTA: boolean;
}

export interface CarouselData {
  topic: string;
  thread: TweetData[];
  slides: SlideData[];
  profile: ProfileConfig;
}

export interface CarouselHistoryItem {
  id: string;
  topic: string;
  slides: SlideData[];
  profile: ProfileConfig;
  createdAt: string;
}
