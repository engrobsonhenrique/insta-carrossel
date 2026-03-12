import { NextRequest, NextResponse } from "next/server";

const UNSPLASH_BASE = "https://api.unsplash.com";

async function searchTavily(
  searchTerms: string[],
  apiKey: string
): Promise<string[]> {
  const images: string[] = [];

  for (const term of searchTerms) {
    try {
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          query: term,
          include_images: true,
          include_image_descriptions: false,
          max_results: 3,
          search_depth: "basic",
        }),
      });

      if (!res.ok) continue;

      const data = await res.json();
      if (data.images && data.images.length > 0) {
        const termImages = data.images
          .slice(0, 2)
          .map((img: string | { url: string }) =>
            typeof img === "string" ? img : img.url
          )
          .filter((url: string) => url && url.startsWith("http"));
        images.push(...termImages);
      }
    } catch {
      continue;
    }
  }

  return images;
}

async function searchUnsplash(
  searchTerms: string[],
  accessKey: string
): Promise<string[]> {
  const images: string[] = [];

  for (const term of searchTerms) {
    try {
      const url = `${UNSPLASH_BASE}/search/photos?query=${encodeURIComponent(term)}&per_page=3&orientation=landscape`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Client-ID ${accessKey}`,
        },
      });

      if (!res.ok) continue;

      const data = await res.json();
      if (data.results && data.results.length > 0) {
        // Get up to 2 images per search term
        const termImages = data.results
          .slice(0, 2)
          .map(
            (r: { urls?: { regular?: string } }) => r?.urls?.regular
          )
          .filter(Boolean) as string[];
        images.push(...termImages);
      }
    } catch {
      continue;
    }
  }

  return images;
}

export async function POST(req: NextRequest) {
  try {
    const { searchTerms } = await req.json();

    if (!searchTerms) {
      return NextResponse.json(
        { error: "searchTerms é obrigatório" },
        { status: 400 }
      );
    }

    // Try Tavily search first
    const tavilyApiKey = process.env.TAVILY_API_KEY;

    if (tavilyApiKey) {
      const images = await searchTavily(searchTerms, tavilyApiKey);
      if (images.length > 0) {
        return NextResponse.json({ images });
      }
    }

    // Fallback to Unsplash
    const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;

    if (unsplashKey) {
      const images = await searchUnsplash(searchTerms, unsplashKey);
      return NextResponse.json({ images });
    }

    return NextResponse.json({ images: [] });
  } catch (error: unknown) {
    console.error("Image search error:", error);
    const message =
      error instanceof Error ? error.message : "Erro ao buscar imagens";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
