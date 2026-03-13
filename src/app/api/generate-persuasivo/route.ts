import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

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

export async function POST(req: NextRequest) {
  try {
    const { topic, persona, selectedHook, ctaType, ctaCustomText, captionFormat } =
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

    const prompt = `Crie 21 textos curtos em PT-BR para um carrossel persuasivo sobre o tema abaixo.${personaInstruction}

${topicInstruction}
${hookInstruction}
Estrutura: Hook(1-3) → Mecanismo(4-9) → Prova(10-15) → Aplicação(16-18) → Direção(19-20) → CTA(21).
Textos 3,6,9,12,14,16,19 devem ser frases curtas e impactantes (40-80 chars).
Os demais devem contextualizar (60-180 chars).
Texto 21: ${ctaInstruction}
Sem 2a pessoa. Sem inventar fatos. Sem markdown. Sem emojis excessivos.
${captionInstruction}
Retorne APENAS JSON valido (sem markdown, sem \`\`\`):
{"texts":["t1","t2","t3","t4","t5","t6","t7","t8","t9","t10","t11","t12","t13","t14","t15","t16","t17","t18","t19","t20","t21"],"searchTerms":["eng term 1","eng term 2","eng term 3","eng term 4","eng term 5"]${captionFormat ? ',"caption":"legenda"' : ""}}

O campo searchTerms deve conter 7 termos em inglês para buscar fotos relevantes (1 por slide com imagem). REGRAS:
- Descreva CENAS ou OBJETOS VISUAIS concretos (ex: "doctor examining patient hospital", "smartphone data analytics dashboard")
- NÃO use conceitos abstratos (ex: "success", "power", "growth")
- 3-5 palavras descritivas por termo
- Cada termo deve corresponder ao conteúdo do slide respectivo
- Pense: "que foto ilustraria bem este slide?"`;


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

    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Falha ao gerar conteúdo persuasivo. Tente novamente." },
        { status: 500 }
      );
    }

    let data;
    try {
      data = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json(
        { error: "Formato inválido. Tente novamente." },
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
