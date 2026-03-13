import { TweetData, SlideData, SlideElement, PersuasiveTemplate } from "./types";

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

// CM5.4 Template layout definitions
interface SlideLayout {
  textIndices: number[];
  boldIndices: number[]; // which of the textIndices are bold
  imageAfter: number; // insert image after this text index (-1 = no image, 99 = at end)
  isHook?: boolean;
  isCTA?: boolean;
}

// Twitter Template: 21 texts across 8 slides
const TWITTER_TEMPLATE_LAYOUT: SlideLayout[] = [
  { textIndices: [0, 1, 2], boldIndices: [2], imageAfter: 1, isHook: true },
  { textIndices: [3, 4, 5], boldIndices: [5], imageAfter: 4 },
  { textIndices: [6, 7, 8], boldIndices: [8], imageAfter: 6 },
  { textIndices: [9, 10, 11], boldIndices: [11], imageAfter: 10 },
  { textIndices: [12, 13, 14], boldIndices: [13], imageAfter: 13 },
  { textIndices: [15, 16, 17], boldIndices: [15], imageAfter: -1 },
  { textIndices: [18, 19], boldIndices: [18], imageAfter: 99 },
  { textIndices: [20], boldIndices: [], imageAfter: -1, isCTA: true },
];

// Autoral Template: 18 texts across 7 slides — editorial, no header
const AUTORAL_TEMPLATE_LAYOUT: SlideLayout[] = [
  // Slide 1: bold hook + supporting text + IMAGE
  { textIndices: [0, 1], boldIndices: [0], imageAfter: 99, isHook: true },
  // Slide 2: text + bold insight + text
  { textIndices: [2, 3, 4], boldIndices: [3], imageAfter: -1 },
  // Slide 3: text + IMAGE + bold text
  { textIndices: [5, 6, 7], boldIndices: [7], imageAfter: 5 },
  // Slide 4: bold text + text + IMAGE
  { textIndices: [8, 9, 10], boldIndices: [8], imageAfter: 99 },
  // Slide 5: text + bold text + text
  { textIndices: [11, 12, 13], boldIndices: [12], imageAfter: -1 },
  // Slide 6: text + IMAGE + bold text
  { textIndices: [14, 15, 16], boldIndices: [16], imageAfter: 14 },
  // Slide 7: CTA bold
  { textIndices: [17], boldIndices: [17], imageAfter: -1, isCTA: true },
];

// Principal Template: 18 texts across 8 slides — with header + accent bar
const PRINCIPAL_TEMPLATE_LAYOUT: SlideLayout[] = [
  // Slide 1: hook bold + text + IMAGE
  { textIndices: [0, 1], boldIndices: [0], imageAfter: 99, isHook: true },
  // Slide 2: text + text + bold
  { textIndices: [2, 3, 4], boldIndices: [4], imageAfter: -1 },
  // Slide 3: text + IMAGE + bold
  { textIndices: [5, 6], boldIndices: [6], imageAfter: 5 },
  // Slide 4: bold + text + IMAGE
  { textIndices: [7, 8], boldIndices: [7], imageAfter: 99 },
  // Slide 5: text + bold + text
  { textIndices: [9, 10, 11], boldIndices: [10], imageAfter: -1 },
  // Slide 6: text + IMAGE + bold
  { textIndices: [12, 13], boldIndices: [13], imageAfter: 12 },
  // Slide 7: bold + text + text
  { textIndices: [14, 15, 16], boldIndices: [14], imageAfter: -1 },
  // Slide 8: CTA
  { textIndices: [17], boldIndices: [], imageAfter: -1, isCTA: true },
];

// Futurista Template: 14 texts across 10 slides — compact, centered, minimal
const FUTURISTA_TEMPLATE_LAYOUT: SlideLayout[] = [
  // Slide 1: bold hook
  { textIndices: [0], boldIndices: [0], imageAfter: -1, isHook: true },
  // Slide 2: text + IMAGE
  { textIndices: [1], boldIndices: [], imageAfter: 99 },
  // Slide 3: bold insight
  { textIndices: [2], boldIndices: [2], imageAfter: -1 },
  // Slide 4: text + text
  { textIndices: [3, 4], boldIndices: [], imageAfter: -1 },
  // Slide 5: bold + IMAGE
  { textIndices: [5], boldIndices: [5], imageAfter: 99 },
  // Slide 6: text
  { textIndices: [6], boldIndices: [], imageAfter: -1 },
  // Slide 7: bold
  { textIndices: [7], boldIndices: [7], imageAfter: -1 },
  // Slide 8: text + IMAGE
  { textIndices: [8, 9], boldIndices: [], imageAfter: 99 },
  // Slide 9: bold + text
  { textIndices: [10, 11, 12], boldIndices: [10], imageAfter: -1 },
  // Slide 10: CTA bold
  { textIndices: [13], boldIndices: [13], imageAfter: -1, isCTA: true },
];

// Registry mapping template → layout + expected text count
const TEMPLATE_LAYOUTS: Record<PersuasiveTemplate, { layout: SlideLayout[]; textCount: number }> = {
  twitter: { layout: TWITTER_TEMPLATE_LAYOUT, textCount: 21 },
  autoral: { layout: AUTORAL_TEMPLATE_LAYOUT, textCount: 18 },
  principal: { layout: PRINCIPAL_TEMPLATE_LAYOUT, textCount: 18 },
  futurista: { layout: FUTURISTA_TEMPLATE_LAYOUT, textCount: 14 },
};

export function getTemplateTextCount(templateId: PersuasiveTemplate): number {
  return TEMPLATE_LAYOUTS[templateId].textCount;
}

function cleanMarkdown(text: string): string {
  return text.replace(/\*\*/g, "").replace(/\*/g, "").replace(/__/g, "").trim();
}

export function buildPersuasiveSlides(
  texts: string[],
  images: string[],
  templateId: PersuasiveTemplate = "twitter"
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

  const { layout } = TEMPLATE_LAYOUTS[templateId];

  return layout.map((slideLayout, slideIdx) => {
    const elements: SlideElement[] = [];
    const hasImage = slideLayout.imageAfter >= 0;
    const slideImage = hasImage ? getNextImage() : undefined;

    for (let i = 0; i < slideLayout.textIndices.length; i++) {
      const textIdx = slideLayout.textIndices[i];
      const text = textIdx < texts.length ? texts[textIdx] : "";
      const isBold = slideLayout.boldIndices.includes(textIdx);

      elements.push({ type: "text", content: text, bold: isBold });

      // Insert image after this text if it matches
      if (slideLayout.imageAfter === textIdx && slideImage) {
        elements.push({ type: "image" });
      }
    }

    // Image at end (imageAfter: 99)
    if (slideLayout.imageAfter === 99 && slideImage) {
      elements.push({ type: "image" });
    }

    return {
      id: slideIdx + 1,
      tweets: [{ text: elements.filter(e => e.type === "text").map(e => e.content).join(" ") }],
      imageUrl: slideImage,
      isHook: slideLayout.isHook || false,
      isCTA: slideLayout.isCTA || false,
      contentStyle: "persuasivo" as const,
      persuasiveBlock: { elements },
      templateId,
    };
  });
}
