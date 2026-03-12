export interface ProfileConfig {
  displayName: string;
  handle: string;
  verified: boolean;
  headshotUrl: string | null;
  theme: "light" | "dark";
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
