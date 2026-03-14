import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let buffer: Buffer;
    let fileName: string;

    if (contentType.includes("multipart/form-data")) {
      // FormData upload (binary — avoids body size limits)
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json(
          { error: "file is required" },
          { status: 400 }
        );
      }
      fileName = file.name || `slide-${Date.now()}.png`;
      buffer = Buffer.from(await file.arrayBuffer());
    } else {
      // Legacy JSON upload (base64)
      const body = await req.json();
      const { image, fileName: fn } = body as {
        image: string;
        fileName: string;
      };
      if (!image || !fn) {
        return NextResponse.json(
          { error: "image and fileName are required" },
          { status: 400 }
        );
      }
      fileName = fn;
      const base64 = image.replace(/^data:image\/\w+;base64,/, "");
      buffer = Buffer.from(base64, "base64");
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\s+/g, "");
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/\s+/g, "");

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: "Supabase não configurado no servidor." },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const path = `carousel-images/${fileName}`;

    const { error } = await supabase.storage
      .from("carousel-images")
      .upload(path, buffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    const { data: urlData } = supabase.storage
      .from("carousel-images")
      .getPublicUrl(path);

    return NextResponse.json({ url: urlData.publicUrl });
  } catch (error: unknown) {
    console.error("Upload slide error:", error);
    const message =
      error instanceof Error ? error.message : "Erro no upload";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
