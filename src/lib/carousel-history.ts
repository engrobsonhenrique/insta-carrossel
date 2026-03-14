import { CarouselHistoryItem, SlideData, ProfileConfig } from "./types";

const STORAGE_KEY = "insta-carrossel-history";
const MAX_ITEMS = 5;

// Strip base64 data URLs from slides to avoid localStorage quota issues
function stripBase64Images(slides: SlideData[]): SlideData[] {
  return slides.map((slide) => ({
    ...slide,
    imageUrl:
      slide.imageUrl && slide.imageUrl.startsWith("data:")
        ? undefined
        : slide.imageUrl,
  }));
}

export function getHistory(): CarouselHistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CarouselHistoryItem[];
  } catch {
    return [];
  }
}

export function saveToHistory(data: {
  topic: string;
  slides: SlideData[];
  profile: ProfileConfig;
  caption?: string;
}): CarouselHistoryItem {
  const history = getHistory();
  const item: CarouselHistoryItem = {
    id: Date.now().toString(36),
    topic: data.topic,
    slides: stripBase64Images(data.slides),
    profile: {
      ...data.profile,
      headshotUrl:
        data.profile.headshotUrl && data.profile.headshotUrl.startsWith("data:")
          ? null
          : data.profile.headshotUrl,
      blotatoApiKey: undefined,
      blotatoAccountId: undefined,
    },
    caption: data.caption || undefined,
    createdAt: new Date().toISOString(),
  };

  history.unshift(item);
  if (history.length > MAX_ITEMS) history.pop();

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // storage still full — keep removing oldest until it fits
    while (history.length > 1) {
      history.pop();
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
        return item;
      } catch {
        continue;
      }
    }
    // Last resort: clear and save only this item
    localStorage.setItem(STORAGE_KEY, JSON.stringify([item]));
  }

  return item;
}

export function deleteFromHistory(id: string): void {
  const history = getHistory().filter((h) => h.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function clearHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}
