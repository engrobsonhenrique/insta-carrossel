import { CarouselHistoryItem, SlideData, ProfileConfig } from "./types";

const STORAGE_KEY = "insta-carrossel-history";
const MAX_ITEMS = 20;

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
}): CarouselHistoryItem {
  const history = getHistory();
  const item: CarouselHistoryItem = {
    id: Date.now().toString(36),
    topic: data.topic,
    slides: data.slides,
    profile: data.profile,
    createdAt: new Date().toISOString(),
  };

  history.unshift(item);
  if (history.length > MAX_ITEMS) history.pop();

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // storage full — remove oldest and retry
    history.pop();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
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
