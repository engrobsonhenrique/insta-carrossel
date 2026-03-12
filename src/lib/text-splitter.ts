import { TweetData, CTAType } from "./types";

/**
 * Split a long text into tweet-sized chunks for carousel slides.
 * Splits by paragraphs first, then by sentence boundaries if needed.
 */
export function splitTextIntoTweets(
  text: string,
  maxChars: number = 280
): TweetData[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const tweets: TweetData[] = [];

  for (const paragraph of paragraphs) {
    if (paragraph.length <= maxChars) {
      tweets.push({ text: paragraph });
      continue;
    }

    // Split long paragraphs by sentence boundaries
    const sentences = paragraph.match(/[^.!?]+[.!?]+\s*/g) || [paragraph];
    let current = "";

    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (!trimmed) continue;

      if (current.length + trimmed.length + 1 <= maxChars) {
        current = current ? `${current} ${trimmed}` : trimmed;
      } else {
        if (current) tweets.push({ text: current.trim() });
        // If a single sentence is too long, split by word boundary
        if (trimmed.length > maxChars) {
          const words = trimmed.split(/\s+/);
          current = "";
          for (const word of words) {
            if (current.length + word.length + 1 <= maxChars) {
              current = current ? `${current} ${word}` : word;
            } else {
              if (current) tweets.push({ text: current.trim() });
              current = word;
            }
          }
        } else {
          current = trimmed;
        }
      }
    }
    if (current.trim()) tweets.push({ text: current.trim() });
  }

  return tweets.length > 0 ? tweets : [{ text: text.slice(0, maxChars) }];
}

const CTA_TEXTS: Record<Exclude<CTAType, "custom">, string> = {
  salvar: "Gostou do conteúdo? Salve este post para consultar depois! 🔖",
  compartilhar:
    "Se esse conteúdo fez sentido pra você, compartilhe com alguém que precisa ver isso! 📤",
  comentar:
    "Concorda? Conta nos comentários o que você pensa sobre isso! 💬",
};

export function buildCTATweet(
  ctaType: CTAType,
  customText?: string
): TweetData {
  if (ctaType === "custom" && customText?.trim()) {
    return { text: customText.trim() };
  }
  return { text: CTA_TEXTS[ctaType as Exclude<CTAType, "custom">] || CTA_TEXTS.salvar };
}
