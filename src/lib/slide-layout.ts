import { TweetData, SlideData, PersuasiveBlock } from "./types";

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

export function buildPersuasiveSlides(
  blocks: PersuasiveBlock[],
  images: string[]
): SlideData[] {
  if (blocks.length === 0) return [];

  const validImages = images.filter(
    (url) => !url.startsWith("data:text/")
  );

  return blocks.map((block, i) => {
    const imageUrl = i < validImages.length
      ? validImages[i]
      : validImages.length > 0
        ? validImages[i % validImages.length]
        : undefined;

    const isLast = i === blocks.length - 1;

    return {
      id: i + 1,
      tweets: [{ text: block.textAbove }],
      imageUrl: isLast ? undefined : imageUrl,
      isHook: i === 0,
      isCTA: isLast,
      contentStyle: "persuasivo" as const,
      persuasiveBlock: block,
    };
  });
}
