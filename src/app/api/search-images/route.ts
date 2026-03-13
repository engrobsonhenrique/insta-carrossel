import { NextRequest, NextResponse } from "next/server";

const UNSPLASH_BASE = "https://api.unsplash.com";

async function downloadAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CarouselBot/1.0)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "image/jpeg";
    // Reject non-image responses (e.g. HTML redirect/captcha pages)
    if (!contentType.startsWith("image/")) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    // Skip tiny images (likely icons/trackers) — under 5KB
    if (buffer.length < 5000) return null;
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

async function searchTavily(
  searchTerms: string[],
  apiKey: string
): Promise<string[]> {
  const images: string[] = [];

  // Search all terms in parallel for speed
  const results = await Promise.allSettled(
    searchTerms.map(async (term) => {
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          query: term,
          include_images: true,
          include_image_descriptions: false,
          max_results: 5,
          search_depth: "basic",
        }),
      });

      if (!res.ok) return [];

      const data = await res.json();
      if (data.images && data.images.length > 0) {
        const urls = data.images
          .slice(0, 3)
          .map((img: string | { url: string }) =>
            typeof img === "string" ? img : img.url
          )
          .filter((url: string) => url && url.startsWith("http"));

        const downloads = await Promise.all(urls.map(downloadAsDataUrl));
        return downloads.filter((d): d is string => d !== null);
      }
      return [];
    })
  );

  for (const r of results) {
    if (r.status === "fulfilled") {
      images.push(...r.value);
    }
  }

  return images;
}

async function searchUnsplash(
  searchTerms: string[],
  accessKey: string
): Promise<string[]> {
  const images: string[] = [];

  // Search all terms in parallel
  const results = await Promise.allSettled(
    searchTerms.map(async (term) => {
      const url = `${UNSPLASH_BASE}/search/photos?query=${encodeURIComponent(term)}&per_page=3&orientation=landscape`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Client-ID ${accessKey}`,
        },
      });

      if (!res.ok) return [];

      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const termUrls = data.results
          .slice(0, 2)
          .map(
            (r: { urls?: { regular?: string } }) => r?.urls?.regular
          )
          .filter(Boolean) as string[];
        const downloads = await Promise.all(termUrls.map(downloadAsDataUrl));
        return downloads.filter((d): d is string => d !== null);
      }
      return [];
    })
  );

  for (const r of results) {
    if (r.status === "fulfilled") {
      images.push(...r.value);
    }
  }

  return images;
}

export async function POST(req: NextRequest) {
  try {
    const { searchTerms, articleImages } = await req.json();

    if (!searchTerms) {
      return NextResponse.json(
        { error: "searchTerms é obrigatório" },
        { status: 400 }
      );
    }

    const allImages: string[] = [];
    const neededImages = searchTerms.length * 2; // ~2 per term

    // 1. Priority: download article images first (from the original URL)
    if (articleImages && articleImages.length > 0) {
      const downloads = await Promise.all(
        articleImages.slice(0, 10).map(downloadAsDataUrl)
      );
      allImages.push(...downloads.filter((d): d is string => d !== null));
    }

    // 2. If we still need more, search Tavily
    const tavilyApiKey = process.env.TAVILY_API_KEY;
    if (allImages.length < neededImages && tavilyApiKey) {
      const tavilyImages = await searchTavily(searchTerms, tavilyApiKey);
      allImages.push(...tavilyImages);
    }

    // 3. If still not enough, complement with Unsplash
    const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
    if (allImages.length < neededImages && unsplashKey) {
      // Only search terms that still need images
      const termsNeeded = Math.ceil(
        ((neededImages - allImages.length) / 2)
      );
      const unsplashImages = await searchUnsplash(
        searchTerms.slice(0, termsNeeded),
        unsplashKey
      );
      allImages.push(...unsplashImages);
    }

    return NextResponse.json({ images: allImages });
  } catch (error: unknown) {
    console.error("Image search error:", error);
    const message =
      error instanceof Error ? error.message : "Erro ao buscar imagens";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
