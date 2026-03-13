export type GenerationMode = "rapido" | "avancado";

export type CTAType = "salvar" | "compartilhar" | "comentar" | "custom";

export type CaptionFormat = "curta" | "longa";

export type ContentStyle = "informativo" | "persuasivo";

export type PersuasiveTemplate = "twitter" | "autoral" | "principal" | "futurista";

export interface ColorPalette {
  id: string;
  name: string;
  bg: string;
  text: string;
  secondary: string;
  divider: string;
  accent: string;
  avatarBg: string;
}

export interface SlideElement {
  type: "text" | "image";
  content?: string;
  bold?: boolean;
}

export interface PersuasiveBlock {
  elements: SlideElement[];
  // Legacy compat
  textAbove?: string;
  textBelow?: string;
}

export interface AdvancedOptions {
  ctaType: CTAType;
  ctaCustomText?: string;
  usePasteText?: boolean;
  pasteOwnText?: string;
  captionFormat?: CaptionFormat;
  contentStyle?: ContentStyle;
  persuasiveTemplate?: PersuasiveTemplate;
}

export interface ProfileConfig {
  displayName: string;
  handle: string;
  verified: boolean;
  headshotUrl: string | null;
  theme: "light" | "dark";
  persona?: string;
  paletteId?: string;
}

export interface TweetData {
  text: string;
  imageUrl?: string;
}

export interface SlideData {
  id: number;
  tweets: TweetData[];
  imageUrl?: string;
  imageHeight?: number;
  isHook: boolean;
  isCTA: boolean;
  contentStyle?: ContentStyle;
  persuasiveBlock?: PersuasiveBlock;
  templateId?: PersuasiveTemplate;
}

export interface CarouselData {
  topic: string;
  thread: TweetData[];
  slides: SlideData[];
  profile: ProfileConfig;
}

export interface HookOption {
  id: number;
  text: string;
  style: string;
}

export interface CarouselHistoryItem {
  id: string;
  topic: string;
  slides: SlideData[];
  profile: ProfileConfig;
  createdAt: string;
}
