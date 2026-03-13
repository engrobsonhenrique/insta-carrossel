import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { PersuasiveTemplate } from "@/lib/types";
import { extractJSON } from "@/lib/json-extract";

export const runtime = "edge";
export const maxDuration = 60;

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

    // Extract images from article
    const images: string[] = [];
    const baseUrl = new URL(url);

    // og:image first
    const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (ogMatch?.[1]) images.push(ogMatch[1]);

    // Article/main content images
    const articleMatch = html.match(/<article[\s\S]*?<\/article>/i)
      || html.match(/<main[\s\S]*?<\/main>/i)
      || html.match(/<div[^>]+class=["'][^"']*(?:content|post|article|story)[^"']*["'][\s\S]*?<\/div>/i);
    const contentHtml = articleMatch ? articleMatch[0] : html;

    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    let imgMatch;
    while ((imgMatch = imgRegex.exec(contentHtml)) !== null) {
      let src = imgMatch[1];
      if (src.startsWith("data:") || src.endsWith(".svg") || src.includes("pixel") || src.includes("tracker")) continue;
      if (/width=["']?[1-9]\d?["']?/i.test(imgMatch[0]) && !/width=["']?\d{3,}["']?/i.test(imgMatch[0])) continue;
      if (src.startsWith("//")) src = baseUrl.protocol + src;
      else if (src.startsWith("/")) src = baseUrl.origin + src;
      else if (!src.startsWith("http")) continue;
      if (!images.includes(src)) images.push(src);
    }

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
      images: images.slice(0, 15),
    };
  } catch {
    return null;
  }
}

const TEMPLATE_CONFIGS: Record<PersuasiveTemplate, { textCount: number; structure: string; searchCount: number }> = {
  twitter: {
    textCount: 21,
    structure: "Hook(1-3) → Mecanismo(4-9) → Prova(10-15) → Aplicação(16-18) → Direção(19-20) → CTA(21).\nTextos 3,6,9,12,14,16,19 devem ser frases curtas e impactantes (40-80 chars).\nOs demais devem contextualizar (60-180 chars).",
    searchCount: 7,
  },
  autoral: {
    textCount: 18,
    structure: "Hook impactante(1) → Desenvolvimento(2) → Contexto(3-4) → Insight(5) → Aprofundamento(6-7) → Revelação(8) → Transição(9-10) → Prova(11) → Provocação(12-13) → Aplicação(14-15) → Conclusão(16) → Fechamento(17) → CTA(18).\nTextos 1,3,5,8,12,16 devem ser frases curtas e impactantes (40-80 chars).\nOs demais devem ser narrativos e fluídos (80-200 chars).\nEstilo editorial contínuo, como se fosse um ensaio.",
    searchCount: 4,
  },
  principal: {
    textCount: 18,
    structure: "Hook(1) → Abertura(2) → Contexto(3-4) → Destaque(5) → Desenvolvimento(6-7) → Insight(8) → Argumento(9-10) → Ponto-chave(11) → Evidência(12-13) → Conclusão(14) → Aplicação(15-16) → Direção(17) → CTA(18).\nTextos 1,5,7,8,10,14 devem ser frases curtas e impactantes (40-80 chars).\nOs demais devem contextualizar (60-180 chars).",
    searchCount: 5,
  },
  futurista: {
    textCount: 14,
    structure: "Hook provocativo(1) → Contexto(2) → Insight(3) → Argumento A(4) → Argumento B(5) → Revelação(6) → Ponto-chave(7) → Provocação(8) → Evidência(9-10) → Conclusão(11) → Aplicação(12) → Fechamento(13) → CTA(14).\nTextos 1,3,5,8,11 devem ser frases curtas e provocativas (30-70 chars).\nOs demais devem ser concisos (50-120 chars).\nEstilo minimalista e futurista. Frases de impacto.",
    searchCount: 3,
  },
};

export async function POST(req: NextRequest) {
  try {
    const { topic, persona, selectedHook, ctaType, ctaCustomText, captionFormat, template } =
      await req.json();
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

    const templateId: PersuasiveTemplate = template || "twitter";
    const config = TEMPLATE_CONFIGS[templateId];

    let articleContent: string | null = null;
    let articleImages: string[] = [];
    if (isUrl(topic)) {
      const articleData = await extractArticleData(topic);
      if (!articleData) {
        return NextResponse.json(
          {
            error:
              "Não foi possível acessar o conteúdo do link. Verifique a URL e tente novamente.",
          },
          { status: 400 }
        );
      }
      articleContent = articleData.content;
      articleImages = articleData.images;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const models = [
      "gemini-2.0-flash",
      "gemini-2.0-flash-lite",
      "gemini-1.5-flash",
    ];

    const topicInstruction = articleContent
      ? `O usuário enviou um link de uma matéria. Baseie o carrossel no conteúdo abaixo:\n\n---\n${articleContent}\n---`
      : `O tema do carrossel é: "${topic}"`;

    const personaInstruction = persona?.trim()
      ? `\nPERSONA DO CRIADOR (adapte o tom, linguagem e estilo):\n${persona.trim()}\n`
      : "";

    const hookInstruction = selectedHook
      ? `\nHEADLINE ESCOLHIDA PELO USUÁRIO — OBRIGATÓRIO:
O texto 1 DEVE ser exatamente: "${selectedHook.split("\n")[0]}"
${selectedHook.includes("\n") ? `O texto 2 DEVE ser exatamente: "${selectedHook.split("\n")[1]}"` : "O texto 2 deve desenvolver essa headline."}
NÃO modifique esses textos. Use-os literalmente como os primeiros blocos do slide 1.\n`
      : "";

    const ctaInstruction = ctaCustomText
      ? `Use exatamente este texto como CTA: "${ctaCustomText}"`
      : ctaType === "salvar"
        ? "CTA pedindo para SALVAR o post."
        : ctaType === "compartilhar"
          ? "CTA pedindo para COMPARTILHAR o post."
          : ctaType === "comentar"
            ? "CTA pedindo para COMENTAR no post."
            : "CTA pedindo para seguir, curtir ou salvar.";

    const captionInstruction = captionFormat
      ? `\nLEGENDA DO POST:\nGere também uma legenda para o post.${
          captionFormat === "curta"
            ? " Curta (2-4 linhas), direta ao ponto com CTA. Máximo 300 caracteres."
            : " Longa (8-15 linhas), com contexto, storytelling, hashtags e CTA. 500-1500 caracteres."
        }\n`
      : "";

    // Build the texts array placeholder for JSON output
    const textsPlaceholder = Array.from({ length: config.textCount }, (_, i) => `"t${i + 1}"`).join(",");
    const searchPlaceholder = Array.from({ length: config.searchCount }, (_, i) => `"eng term ${i + 1}"`).join(",");

    const prompt = `Crie ${config.textCount} textos curtos em PT-BR para um carrossel persuasivo sobre o tema abaixo.${personaInstruction}

${topicInstruction}
${hookInstruction}
Estrutura: ${config.structure}
Texto ${config.textCount}: ${ctaInstruction}
Sem 2a pessoa. Sem inventar fatos. Sem markdown. Sem emojis excessivos.
${captionInstruction}
Retorne APENAS JSON valido (sem markdown, sem \`\`\`):
{"texts":[${textsPlaceholder}],"searchTerms":[${searchPlaceholder}]${captionFormat ? ',"caption":"legenda"' : ""}}

searchTerms: ${config.searchCount} termos em inglês para buscar fotos. REGRAS:
- Descreva CENAS ou OBJETOS concretos (ex: "doctor examining patient hospital")
- NÃO use conceitos abstratos (ex: "success", "growth")
- 3-5 palavras por termo`;


    let result;
    let lastError;

    for (const modelName of models) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
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
    console.error("generate-persuasivo raw response:", rawText.slice(0, 500));
    const data = extractJSON(rawText);
    if (!data) {
      return NextResponse.json(
        { error: `Formato inválido. Resposta: ${rawText.slice(0, 200)}` },
        { status: 500 }
      );
    }

    if (articleImages.length > 0) {
      data.articleImages = articleImages;
    }
    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("Generate persuasivo error:", error);
    const message =
      error instanceof Error ? error.message : "Erro ao gerar conteúdo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
