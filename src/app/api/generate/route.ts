import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const { topic } = await req.json();
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

    const genAI = new GoogleGenerativeAI(apiKey);
    const models = [
      "gemini-1.5-flash",
      "gemini-2.0-flash-lite",
      "gemini-2.0-flash",
    ];
    let result;
    let lastError;

    for (const modelName of models) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });

        const prompt = `Você é um especialista em criar threads virais para Instagram/Twitter sobre qualquer tema.

O usuário quer criar um carrossel sobre: "${topic}"

Crie uma thread com 6-8 tweets sobre esse tema. A thread deve seguir esta estrutura:

1. **Hook** (Tweet 1): Uma frase impactante e curiosa que prende a atenção. Deve ser curta e poderosa.
2. **Body** (Tweets 2-6/7): Conteúdo informativo, dados, fatos interessantes. Cada tweet deve ter entre 80-280 caracteres.
3. **CTA** (Último tweet): Call-to-action pedindo para seguir, curtir, compartilhar ou salvar.

Regras:
- Escreva em português do Brasil
- Use linguagem acessível e envolvente
- Inclua dados e fatos quando relevante
- Cada tweet deve fazer sentido sozinho mas conectar com os outros
- Use emojis com moderação (1-2 por tweet no máximo)
- O hook deve ser MUITO chamativo

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
  "searchTerms": ["specific search term 1", "specific search term 2", "specific search term 3", "specific search term 4", "specific search term 5"]
}

O campo searchTerms deve conter 5 termos em inglês, bem específicos e descritivos, para buscar imagens relevantes ao tema na web. Cada termo deve ser uma frase curta e descritiva (2-4 palavras) que retorne imagens visualmente relevantes ao conteúdo dos tweets. Evite termos genéricos.`;

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
        { error: "Falha ao gerar conteúdo. Tente novamente." },
        { status: 500 }
      );
    }

    const data = JSON.parse(jsonMatch[0]);
    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("Generate error:", error);
    const message =
      error instanceof Error ? error.message : "Erro ao gerar conteúdo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
