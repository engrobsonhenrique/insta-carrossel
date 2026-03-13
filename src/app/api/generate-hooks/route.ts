import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

function isUrl(text: string): boolean {
  return /^https?:\/\//i.test(text.trim());
}

async function extractArticleContent(url: string): Promise<string | null> {
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

    return cleaned.slice(0, 8000);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { topic, persona } = await req.json();
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
    if (isUrl(topic)) {
      articleContent = await extractArticleContent(topic);
      if (!articleContent) {
        return NextResponse.json(
          { error: "Não foi possível acessar o conteúdo do link." },
          { status: 400 }
        );
      }
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const models = [
      "gemini-1.5-flash",
      "gemini-2.0-flash-lite",
      "gemini-2.0-flash",
    ];

    const topicInstruction = articleContent
      ? `Baseie os hooks no conteúdo desta matéria:\n\n---\n${articleContent}\n---`
      : `O tema do carrossel é: "${topic}"`;

    const personaInstruction = persona?.trim()
      ? `\nPERSONA DO CRIADOR (adapte o tom e estilo):\n${persona.trim()}\n`
      : "";

    const prompt = `Você é um especialista em criar hooks virais para Instagram.${personaInstruction}

${topicInstruction}

Gere exatamente 5 opções de hooks (a primeira frase de abertura de um carrossel) sobre esse tema.
Cada hook deve usar um estilo diferente:
1. Curiosidade - desperta a curiosidade do leitor
2. Dado impactante - começa com um número ou fato surpreendente
3. Pergunta provocativa - faz uma pergunta que o leitor quer responder
4. Afirmação controversa - uma opinião forte que gera engajamento
5. História pessoal - começa com uma narrativa envolvente

Regras:
- Escreva em português do Brasil
- Cada hook deve ter entre 40-150 caracteres
- Devem ser frases curtas, impactantes e que prendam a atenção
- Use emojis com moderação (0-1 por hook)

Retorne APENAS um JSON válido neste formato (sem markdown, sem \`\`\`):
{
  "hooks": [
    {"id": 1, "text": "texto do hook", "style": "Curiosidade"},
    {"id": 2, "text": "texto do hook", "style": "Dado impactante"},
    {"id": 3, "text": "texto do hook", "style": "Pergunta provocativa"},
    {"id": 4, "text": "texto do hook", "style": "Afirmação controversa"},
    {"id": 5, "text": "texto do hook", "style": "História pessoal"}
  ]
}`;

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
        { error: "Falha ao gerar hooks. Tente novamente." },
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

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("Generate hooks error:", error);
    const message =
      error instanceof Error ? error.message : "Erro ao gerar hooks";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
