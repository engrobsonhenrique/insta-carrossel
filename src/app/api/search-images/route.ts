import { NextRequest, NextResponse } from "next/server";

const UNSPLASH_BASE = "https://api.unsplash.com";

export async function POST(req: NextRequest) {
  try {
    const { searchTerms, accessKey } = await req.json();

    if (!searchTerms || !accessKey) {
      return NextResponse.json(
        { error: "searchTerms e accessKey são obrigatórios" },
        { status: 400 }
      );
    }

    const images: string[] = [];

    for (const term of searchTerms) {
      const url = `${UNSPLASH_BASE}/search/photos?query=${encodeURIComponent(term)}&per_page=3&orientation=landscape`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Client-ID ${accessKey}`,
        },
      });

      if (!res.ok) continue;

      const data = await res.json();
      if (data.results && data.results.length > 0) {
        // Get the regular size image (1080px wide)
        const img = data.results[0]?.urls?.regular;
        if (img) images.push(img);
      }
    }

    return NextResponse.json({ images });
  } catch (error: unknown) {
    console.error("Image search error:", error);
    const message =
      error instanceof Error ? error.message : "Erro ao buscar imagens";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
