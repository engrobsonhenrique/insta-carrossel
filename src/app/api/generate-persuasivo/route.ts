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
    if (isUrl(topic)) {
      articleContent = await extractArticleContent(topic);
      if (!articleContent) {
        return NextResponse.json(
          {
            error:
              "Não foi possível acessar o conteúdo do link. Verifique a URL e tente novamente.",
          },
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
      ? `O usuário enviou um link de uma matéria. Baseie o carrossel no conteúdo abaixo:\n\n---\n${articleContent}\n---`
      : `O tema do carrossel é: "${topic}"`;

    const personaInstruction = persona?.trim()
      ? `\nPERSONA DO CRIADOR (adapte o tom, linguagem e estilo):\n${persona.trim()}\n`
      : "";

    const hookInstruction = selectedHook
      ? `\nHEADLINE ESCOLHIDA PELO USUÁRIO (use exatamente como base do slide 1):\n"${selectedHook}"\nO slide 1 deve usar essa headline. Se tiver duas linhas (separadas por \\n), a primeira é o textAbove e a segunda é o textBelow.\n`
      : "";

    const ctaInstruction = ctaCustomText
      ? `Use exatamente este texto como CTA no último slide: "${ctaCustomText}"`
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

    const prompt = `Você é um especialista em criar carrosséis persuasivos para Instagram usando a metodologia Content Machine.${personaInstruction}

${topicInstruction}
${hookInstruction}

METODOLOGIA:
Internamente, antes de gerar o conteúdo, realize estas etapas mentais:
1. TRIAGEM: Identifique a transformação (o que mudou), a fricção central (a tensão real), o ângulo narrativo dominante e as evidências observáveis.
2. ESPINHA DORSAL: Defina Hook → Mecanismo (por que acontece) → Prova (evidências) → Aplicação (consequência) → Direção (próximo passo lógico).

FORMATO DE SAÍDA — TEMPLATE TWITTER:
Gere exatamente 8 slides para um carrossel. Cada slide tem:
- "textAbove": texto narrativo/contextual que fica ACIMA da imagem (2-5 linhas, 80-250 caracteres). Tom informativo, contextualiza.
- "textBelow": texto âncora/punchline que fica ABAIXO da imagem (1-2 linhas, 30-120 caracteres). Tom impactante, em negrito. Resume ou arremata a ideia do slide.

Estrutura dos 8 slides:
- Slide 1: HOOK — a captura de atenção mais forte. textAbove = contextualização da tese, textBelow = frase de impacto/ancoragem.
- Slides 2-3: MECANISMO — explique POR QUE o fenômeno acontece.
- Slides 4-5: PROVA — evidências, dados, fatos observáveis.
- Slide 6: APLICAÇÃO — consequência prática ou leitura mais ampla.
- Slide 7: DIREÇÃO — próximo passo lógico, sem CTA comercial.
- Slide 8: CTA — ${ctaInstruction}
${captionInstruction}
REGRAS:
- Escreva em português do Brasil
- Não use 2ª pessoa
- Não invente fatos, números ou fontes
- Cada textAbove deve contextualizar, cada textBelow deve ancorar/arrematar
- A narrativa deve ter progressão lógica entre os slides
- Use emojis com muita moderação (0-1 por slide)
- O textBelow deve ser impactante e memorável

Retorne APENAS um JSON válido neste formato (sem markdown, sem \`\`\`):
{
  "blocks": [
    {"textAbove": "texto acima da imagem", "textBelow": "texto abaixo em negrito"},
    {"textAbove": "...", "textBelow": "..."}
  ],
  "searchTerms": ["termo em ingles 1", "termo 2", "termo 3", "termo 4", "termo 5"]${captionFormat ? `,
  "caption": "legenda do post"` : ""}
}

O campo searchTerms deve conter 5 termos em inglês, específicos e descritivos, para buscar imagens relevantes. Cada termo deve ser uma frase curta (2-4 palavras).`;

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

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("Generate persuasivo error:", error);
    const message =
      error instanceof Error ? error.message : "Erro ao gerar conteúdo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
