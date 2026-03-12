import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const { topic, apiKey } = await req.json();

    if (!topic || !apiKey) {
      return NextResponse.json(
        { error: "Topic e API key são obrigatórios" },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // Try models in order of preference (quota may vary)
    const models = ["gemini-1.5-flash", "gemini-2.0-flash-lite", "gemini-2.0-flash"];
    let model;
    let result;
    let lastError;

    for (const modelName of models) {
      try {
        model = genAI.getGenerativeModel({ model: modelName });

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
  "searchTerms": ["termo de busca 1 em inglês para imagens", "termo 2", "termo 3"]
}

O campo searchTerms deve conter 3 termos em inglês para buscar imagens relevantes ao tema no Unsplash.`;

        result = await model.generateContent(prompt);
        break; // success, stop trying
      } catch (e) {
        lastError = e;
        continue; // try next model
      }
    }

    if (!result) {
      throw lastError || new Error("Todos os modelos falharam");
    }

    const text = result.response.text();

    // Parse JSON from response
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
