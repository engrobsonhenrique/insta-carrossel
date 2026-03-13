import { TweetData, SlideData, SlideElement } from "./types";

/**
 * Smart slide layout logic based on the thread-carousels architecture:
 * - First tweet = hook + image (always its own slide)
 * - Tweet > 200 chars or has image = own slide
 * - Two consecutive short tweets (< 150 chars, no images) = combined
 * - Last tweet = CTA
 */
export function buildSlides(
  tweets: TweetData[],
  images: string[]
): SlideData[] {
  if (tweets.length === 0) return [];

  // Filter out non-image data URLs (e.g. data:text/html from failed downloads)
  const validImages = images.filter(
    (url) => !url.startsWith("data:text/")
  );

  const slides: SlideData[] = [];
  let slideId = 1;
  let imageIndex = 0;

  const getNextImage = (): string | undefined => {
    if (imageIndex < validImages.length) {
      return validImages[imageIndex++];
    }
    return undefined;
  };

  // First tweet is always the hook with an image
  const hookImage = getNextImage();
  slides.push({
    id: slideId++,
    tweets: [tweets[0]],
    imageUrl: tweets[0].imageUrl || hookImage,
    isHook: true,
    isCTA: tweets.length === 1,
  });

  let i = 1;
  while (i < tweets.length) {
    const tweet = tweets[i];
    const isLast = i === tweets.length - 1;

    // If tweet has image or is long, gets its own slide
    if (tweet.imageUrl || tweet.text.length > 200) {
      const img = tweet.imageUrl || getNextImage();
      slides.push({
        id: slideId++,
        tweets: [tweet],
        imageUrl: img,
        isHook: false,
        isCTA: isLast,
      });
      i++;
      continue;
    }

    // Check if we can combine with next tweet
    const nextTweet = i + 1 < tweets.length ? tweets[i + 1] : null;
    if (
      nextTweet &&
      !nextTweet.imageUrl &&
      tweet.text.length < 150 &&
      nextTweet.text.length < 150
    ) {
      const isLastPair = i + 1 === tweets.length - 1;
      slides.push({
        id: slideId++,
        tweets: [tweet, nextTweet],
        imageUrl: undefined,
        isHook: false,
        isCTA: isLastPair,
      });
      i += 2;
      continue;
    }

    // Single tweet slide
    const img =
      tweet.text.length < 100 && !isLast ? undefined : getNextImage();
    slides.push({
      id: slideId++,
      tweets: [tweet],
      imageUrl: img,
      isHook: false,
      isCTA: isLast,
    });
    i++;
  }

  return slides;
}

// CM5.4 Twitter Template layout: 21 texts across 8 slides
// Each slide layout defines: text indices + whether each is bold + where image goes
interface SlideLayout {
  textIndices: number[];
  boldIndices: number[]; // which of the textIndices are bold
  imageAfter: number; // insert image after this text index (-1 = no image, 99 = at end)
  isHook?: boolean;
  isCTA?: boolean;
}

const TWITTER_TEMPLATE_LAYOUT: SlideLayout[] = [
  // Slide 1: text + text + IMAGE + bold text
  { textIndices: [0, 1, 2], boldIndices: [2], imageAfter: 1, isHook: true },
  // Slide 2: text + text + IMAGE + bold text
  { textIndices: [3, 4, 5], boldIndices: [5], imageAfter: 4 },
  // Slide 3: text + IMAGE + text + bold text
  { textIndices: [6, 7, 8], boldIndices: [8], imageAfter: 6 },
  // Slide 4: text + text + IMAGE + bold text
  { textIndices: [9, 10, 11], boldIndices: [11], imageAfter: 10 },
  // Slide 5: text + bold text + IMAGE + text
  { textIndices: [12, 13, 14], boldIndices: [13], imageAfter: 13 },
  // Slide 6: bold text + text + text (no image)
  { textIndices: [15, 16, 17], boldIndices: [15], imageAfter: -1 },
  // Slide 7: bold text + text + IMAGE
  { textIndices: [18, 19], boldIndices: [18], imageAfter: 99 },
  // Slide 8: CTA text
  { textIndices: [20], boldIndices: [], imageAfter: -1, isCTA: true },
];

function cleanMarkdown(text: string): string {
  return text.replace(/\*\*/g, "").replace(/\*/g, "").replace(/__/g, "").trim();
}

export function buildPersuasiveSlides(
  texts: string[],
  images: string[]
): SlideData[] {
  if (texts.length === 0) return [];

  // Clean markdown from all texts
  texts = texts.map(cleanMarkdown);

  const validImages = images.filter(
    (url) => !url.startsWith("data:text/")
  );
  let imageIndex = 0;

  const getNextImage = (): string | undefined => {
    if (imageIndex < validImages.length) {
      return validImages[imageIndex++];
    }
    if (validImages.length > 0) {
      return validImages[imageIndex++ % validImages.length];
    }
    return undefined;
  };

  return TWITTER_TEMPLATE_LAYOUT.map((layout, slideIdx) => {
    const elements: SlideElement[] = [];
    const hasImage = layout.imageAfter >= 0;
    const slideImage = hasImage ? getNextImage() : undefined;

    for (let i = 0; i < layout.textIndices.length; i++) {
      const textIdx = layout.textIndices[i];
      const text = textIdx < texts.length ? texts[textIdx] : "";
      const isBold = layout.boldIndices.includes(textIdx);

      elements.push({ type: "text", content: text, bold: isBold });

      // Insert image after this text if it matches
      if (layout.imageAfter === textIdx && slideImage) {
        elements.push({ type: "image" });
      }
    }

    // Image at end (imageAfter: 99)
    if (layout.imageAfter === 99 && slideImage) {
      elements.push({ type: "image" });
    }

    return {
      id: slideIdx + 1,
      tweets: [{ text: elements.filter(e => e.type === "text").map(e => e.content).join(" ") }],
      imageUrl: slideImage,
      isHook: layout.isHook || false,
      isCTA: layout.isCTA || false,
      contentStyle: "persuasivo" as const,
      persuasiveBlock: { elements },
    };
  });
}
