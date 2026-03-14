import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { extractJSON } from "@/lib/json-extract";

export const runtime = "edge";
export const maxDuration = 30;

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
    const { topic, persona, contentStyle } = await req.json();
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

    const isPersuasivo = contentStyle === "persuasivo";

    const prompt = isPersuasivo
      ? `Você é um especialista em criar headlines persuasivas para carrosséis de Instagram usando a metodologia Content Machine.${personaInstruction}

${topicInstruction}

Internamente, identifique: a transformação (o que mudou), a fricção central (tensão real) e o ângulo narrativo dominante.

Gere exatamente 10 opções de headlines para a capa do carrossel.
Cada headline tem 2 linhas separadas por \\n:
- Linha 1 (captura): termina com "?" ou ":" — deve interromper e gerar curiosidade
- Linha 2 (ancoragem): termina com "." ou "!" — deve ancorar e dar peso à tese

As 10 opções devem variar de natureza:
1. Reenquadramento
2. Conflito oculto
3. Implicação sistêmica
4. Contradição
5. Ameaça/oportunidade
6. Nomeação
7. Diagnóstico cultural
8. Inversão
9. Ambição de mercado
10. Mecanismo social

Regras:
- Escreva em português do Brasil
- Headline não é mini-resumo, é mecanismo de captura
- A linha 1 deve capturar, a linha 2 deve ancorar
- Evite headlines genéricas que serviriam para qualquer tema
- Evite linguagem burocrática ou analítica demais
- Cada opção deve ter relação real com a tese e as evidências

Retorne APENAS um JSON válido neste formato (sem markdown, sem \`\`\`):
{
  "hooks": [
    {"id": 1, "text": "linha de captura?\\nlinha de ancoragem.", "style": "Reenquadramento"},
    {"id": 2, "text": "linha de captura?\\nlinha de ancoragem.", "style": "Conflito oculto"},
    {"id": 3, "text": "linha de captura?\\nlinha de ancoragem.", "style": "Implicação sistêmica"},
    {"id": 4, "text": "linha de captura?\\nlinha de ancoragem.", "style": "Contradição"},
    {"id": 5, "text": "linha de captura?\\nlinha de ancoragem.", "style": "Ameaça/oportunidade"},
    {"id": 6, "text": "linha de captura?\\nlinha de ancoragem.", "style": "Nomeação"},
    {"id": 7, "text": "linha de captura?\\nlinha de ancoragem.", "style": "Diagnóstico cultural"},
    {"id": 8, "text": "linha de captura?\\nlinha de ancoragem.", "style": "Inversão"},
    {"id": 9, "text": "linha de captura?\\nlinha de ancoragem.", "style": "Ambição de mercado"},
    {"id": 10, "text": "linha de captura?\\nlinha de ancoragem.", "style": "Mecanismo social"}
  ]
}`
      : `Você é um especialista em criar hooks virais para Instagram.${personaInstruction}

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
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { maxOutputTokens: 4096 },
        });
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
    console.error("generate-hooks raw response:", rawText.slice(0, 500));
    const data = extractJSON(rawText);
    if (!data) {
      return NextResponse.json(
        { error: `Formato inválido. Resposta: ${rawText.slice(0, 200)}` },
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
