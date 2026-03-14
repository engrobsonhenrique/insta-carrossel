import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { extractJSON } from "@/lib/json-extract";

export const runtime = "edge";
export const maxDuration = 30;

function isUrl(text: string): boolean {
  return /^https?:\/\//i.test(text.trim());
}

interface ArticleData {
  content: string;
  images: string[];
}

async function extractArticleData(url: string): Promise<ArticleData | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; CarouselBot/1.0)",
        Accept: "text/html",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;

    const html = await res.text();

    // Extract images from article content (og:image, article images, content images)
    const images: string[] = [];
    const baseUrl = new URL(url);

    // 1. og:image (highest priority — editorial pick)
    const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (ogMatch?.[1]) images.push(ogMatch[1]);

    // 2. Images inside <article> or main content
    const articleMatch = html.match(/<article[\s\S]*?<\/article>/i)
      || html.match(/<main[\s\S]*?<\/main>/i)
      || html.match(/<div[^>]+class=["'][^"']*(?:content|post|article|story)[^"']*["'][\s\S]*?<\/div>/i);
    const contentHtml = articleMatch ? articleMatch[0] : html;

    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    let imgMatch;
    while ((imgMatch = imgRegex.exec(contentHtml)) !== null) {
      let src = imgMatch[1];
      // Skip tiny icons, trackers, data URIs, SVGs
      if (src.startsWith("data:") || src.endsWith(".svg") || src.includes("pixel") || src.includes("tracker")) continue;
      if (/width=["']?[1-9]\d?["']?/i.test(imgMatch[0]) && !/width=["']?\d{3,}["']?/i.test(imgMatch[0])) continue;
      // Resolve relative URLs
      if (src.startsWith("//")) src = baseUrl.protocol + src;
      else if (src.startsWith("/")) src = baseUrl.origin + src;
      else if (!src.startsWith("http")) continue;
      if (!images.includes(src)) images.push(src);
    }

    // Clean HTML to text
    const cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[\s\S]*?<\/footer>/gi, "")
      .replace(/<header[\s\S]*?<\/header>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();

    return {
      content: cleaned.slice(0, 8000),
      images: images.slice(0, 15), // Cap at 15 images
    };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { topic, persona, ctaType, ctaCustomText, captionFormat, selectedHook } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!topic) {
      return NextResponse.json(
        { error: "Topic é obrigatório" },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API Key não configurada no servidor" },
        { status: 500 }
      );
    }

    // If input is a URL, extract the article content and images
    let articleContent: string | null = null;
    let articleImages: string[] = [];
    if (isUrl(topic)) {
      const articleData = await extractArticleData(topic);
      if (!articleData) {
        return NextResponse.json(
          { error: "Não foi possível acessar o conteúdo do link. Verifique a URL e tente novamente." },
          { status: 400 }
        );
      }
      articleContent = articleData.content;
      articleImages = articleData.images;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const models = [
      "gemini-1.5-flash",
      "gemini-2.0-flash-lite",
      "gemini-2.0-flash",
    ];
    let result;
    let lastError;

    const topicInstruction = articleContent
      ? `O usuário enviou um link de uma matéria/reportagem. Baseie o carrossel no conteúdo abaixo:\n\n---\n${articleContent}\n---`
      : `O usuário quer criar um carrossel sobre: "${topic}"`;

    const personaInstruction = persona?.trim()
      ? `\n\nPERSONA DO CRIADOR (adapte o tom, linguagem e estilo ao perfil abaixo):\n${persona.trim()}\n`
      : "";

    for (const modelName of models) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            maxOutputTokens: 4096,
            responseMimeType: "application/json",
          },
        });

        const prompt = `Você é um especialista em criar threads virais para Instagram/Twitter sobre qualquer tema.${personaInstruction}

${topicInstruction}

Crie uma thread com 6-8 tweets sobre esse tema. A thread deve seguir esta estrutura:

1. **Hook** (Tweet 1): ${
          selectedHook
            ? `Use EXATAMENTE este texto como o primeiro tweet (hook), sem modificar: "${selectedHook}"`
            : "Uma frase impactante e curiosa que prende a atenção. Deve ser curta e poderosa."
        }
2. **Body** (Tweets 2-6/7): Conteúdo informativo, dados, fatos interessantes. Cada tweet deve ter entre 80-280 caracteres.
3. **CTA** (Último tweet): ${
          ctaCustomText
            ? `Use exatamente este texto como CTA: "${ctaCustomText}"`
            : ctaType === "salvar"
              ? "Call-to-action pedindo para SALVAR o post."
              : ctaType === "compartilhar"
                ? "Call-to-action pedindo para COMPARTILHAR o post."
                : ctaType === "comentar"
                  ? "Call-to-action pedindo para COMENTAR no post."
                  : "Call-to-action pedindo para seguir, curtir, compartilhar ou salvar."
        }

Regras:
- Escreva em português do Brasil
- Use linguagem acessível e envolvente
- Inclua dados e fatos quando relevante
- Cada tweet deve fazer sentido sozinho mas conectar com os outros
- Use emojis com moderação (1-2 por tweet no máximo)
- O hook deve ser MUITO chamativo
${captionFormat ? `
LEGENDA DO POST:
Além dos tweets, gere também uma legenda para o post do Instagram.${
  captionFormat === "curta"
    ? " A legenda deve ser CURTA (2-4 linhas), direta ao ponto, com uma frase de impacto e um CTA. Máximo de 300 caracteres."
    : " A legenda deve ser LONGA e completa (8-15 linhas), com contexto, storytelling, hashtags relevantes e CTA. Entre 500-1500 caracteres."
}
` : ""}
Retorne APENAS um JSON válido neste formato (sem markdown, sem \`\`\`):
{
  "tweets": [
    {"text": "texto do tweet 1"},
    {"text": "texto do tweet 2"},
    {"text": "texto do tweet 3"},
    {"text": "texto do tweet 4"},
    {"text": "texto do tweet 5"},
    {"text": "texto do tweet 6"},
    {"text": "texto do tweet 7"}
  ],
  "searchTerms": ["specific search term 1", "specific search term 2", "specific search term 3", "specific search term 4", "specific search term 5"]${captionFormat ? `,
  "caption": "legenda do post aqui"` : ""}
}

O campo searchTerms deve conter 5 termos em inglês para buscar fotos relevantes. REGRAS para searchTerms:
- Cada termo deve descrever uma CENA ou OBJETO VISUAL concreto (ex: "scientist laboratory microscope", "stock market trading screen")
- NÃO use conceitos abstratos (ex: "success", "innovation", "growth")
- Cada termo deve ter 3-5 palavras descritivas
- Os termos devem corresponder na ordem ao conteúdo dos tweets (termo 1 = tweet 1, termo 2 = tweets 2-3, etc.)
- Pense: "que foto ilustraria bem esse tweet?"`;


        result = await model.generateContent(prompt);
        break;
      } catch (e) {
        lastError = e;
        continue;
      }
    }

    if (!result) {
      throw lastError || new Error("Todos os modelos falharam");
    }

    const rawText = result.response.text();
    const data = extractJSON(rawText);
    if (!data) {
      return NextResponse.json(
        { error: "Formato inválido. Tente novamente." },
        { status: 500 }
      );
    }
    // Include article images if available
    if (articleImages.length > 0) {
      data.articleImages = articleImages;
    }
    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("Generate error:", error);
    const message =
      error instanceof Error ? error.message : "Erro ao gerar conteúdo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
