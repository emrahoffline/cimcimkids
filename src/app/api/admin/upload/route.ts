import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { requireAdminApi } from "@/lib/admin-api";
import { randomBytes } from "crypto";
import {
  detectUpload,
  IMAGE_UPLOAD_MAX_BYTES,
  VIDEO_UPLOAD_MAX_BYTES,
} from "@/lib/media";

export async function POST(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Dosya seçilmedi" }, { status: 400 });
    }

    if (file.size > VIDEO_UPLOAD_MAX_BYTES) {
      return NextResponse.json(
        { error: "Dosya boyutu en fazla 40 MB olabilir" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const matched = detectUpload(buffer);

    if (!matched) {
      return NextResponse.json(
        {
          error:
            "Sadece geçerli JPG, PNG, WebP, GIF, MP4 veya WebM yüklenebilir",
        },
        { status: 400 }
      );
    }

    if (matched.kind === "image" && file.size > IMAGE_UPLOAD_MAX_BYTES) {
      return NextResponse.json(
        { error: "Görsel boyutu en fazla 5 MB olabilir" },
        { status: 400 }
      );
    }

    const prefix = matched.kind === "video" ? "product-video" : "product";
    const filename = `${prefix}-${Date.now()}-${randomBytes(4).toString("hex")}.${matched.ext}`;
    const uploadDir = path.join(process.cwd(), "public", "products", "uploads");

    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);

    return NextResponse.json({
      url: `/products/uploads/${filename}`,
      filename,
      kind: matched.kind,
    });
  } catch (err) {
    console.error("[Upload]", err);
    return NextResponse.json(
      { error: "Dosya yüklenirken hata oluştu" },
      { status: 500 }
    );
  }
}
