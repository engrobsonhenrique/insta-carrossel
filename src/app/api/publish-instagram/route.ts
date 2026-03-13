import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";
export const maxDuration = 60;

const BLOTATO_MCP_URL = "https://mcp.blotato.com/mcp";

async function blotatoCall(
  apiKey: string,
  method: string,
  params?: Record<string, unknown>
): Promise<unknown> {
  const res = await fetch(BLOTATO_MCP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "blotato-api-key": apiKey,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method,
      ...(params ? { params } : {}),
      id: Date.now(),
    }),
  });

  const data = await res.json();
  if (data.error) {
    throw new Error(data.error.message || "Blotato API error");
  }
  return data.result;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      blotatoApiKey,
      blotatoAccountId,
      caption,
      mediaUrls,
      scheduledTime,
    } = body as {
      blotatoApiKey: string;
      blotatoAccountId: string;
      caption: string;
      mediaUrls: string[];
      scheduledTime?: string;
    };

    if (!blotatoApiKey || !blotatoAccountId) {
      return NextResponse.json(
        { error: "Configure a API Key e Account ID do Blotato no perfil." },
        { status: 400 }
      );
    }

    if (!mediaUrls?.length) {
      return NextResponse.json(
        { error: "Nenhuma imagem para publicar." },
        { status: 400 }
      );
    }

    // Initialize Blotato session
    await blotatoCall(blotatoApiKey, "initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "insta-carrossel", version: "1.0" },
    });

    // Create post via Blotato
    const postArgs: Record<string, unknown> = {
      accountId: blotatoAccountId,
      platform: "instagram",
      text: caption || "",
      mediaUrls,
    };

    if (scheduledTime) {
      postArgs.scheduledTime = scheduledTime;
    }

    const result = await blotatoCall(blotatoApiKey, "tools/call", {
      name: "blotato_create_post",
      arguments: postArgs,
    });

    return NextResponse.json({
      success: true,
      result,
      mediaUrls,
    });
  } catch (error: unknown) {
    console.error("Publish Instagram error:", error);
    const message =
      error instanceof Error ? error.message : "Erro ao publicar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
