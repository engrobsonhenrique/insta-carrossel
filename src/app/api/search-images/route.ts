import { NextRequest, NextResponse } from "next/server";

const UNSPLASH_BASE = "https://api.unsplash.com";

async function searchGoogle(
  searchTerms: string[],
  apiKey: string,
  cx: string
): Promise<string[]> {
  const images: string[] = [];

  for (const term of searchTerms) {
    try {
      const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(term)}&searchType=image&num=3&imgSize=large`;
      const res = await fetch(url);

      if (!res.ok) continue;

      const data = await res.json();
      if (data.items && data.items.length > 0) {
        // Get up to 2 images per search term
        const termImages = data.items
          .slice(0, 2)
          .map((item: { link: string }) => item.link)
          .filter((link: string) => link && link.startsWith("http"));
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

    // Try Google Custom Search first
    const googleApiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const googleCx = process.env.GOOGLE_SEARCH_CX;

    if (googleApiKey && googleCx) {
      const images = await searchGoogle(searchTerms, googleApiKey, googleCx);
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
