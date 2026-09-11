import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { requireAdminApi } from "@/lib/admin-api";
import { randomBytes } from "crypto";

const MAX_IMAGE_SIZE = 8 * 1024 * 1024; // 8 MB
const MAX_VIDEO_SIZE = 40 * 1024 * 1024; // 40 MB

const MAGIC: Array<{
  ext: string;
  mime: string;
  kind: "image" | "video";
  check: (b: Buffer) => boolean;
}> = [
  {
    ext: "jpg",
    mime: "image/jpeg",
    kind: "image",
    check: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    ext: "png",
    mime: "image/png",
    kind: "image",
    check: (b) =>
      b.length > 8 &&
      b[0] === 0x89 &&
      b[1] === 0x50 &&
      b[2] === 0x4e &&
      b[3] === 0x47,
  },
  {
    ext: "webp",
    mime: "image/webp",
    kind: "image",
    check: (b) =>
      b.length > 12 &&
      b.toString("ascii", 0, 4) === "RIFF" &&
      b.toString("ascii", 8, 12) === "WEBP",
  },
  {
    ext: "gif",
    mime: "image/gif",
    kind: "image",
    check: (b) =>
      b.length > 6 &&
      (b.toString("ascii", 0, 6) === "GIF87a" ||
        b.toString("ascii", 0, 6) === "GIF89a"),
  },
  {
    ext: "mp4",
    mime: "video/mp4",
    kind: "video",
    check: (b) => b.length > 12 && b.toString("ascii", 4, 8) === "ftyp",
  },
  {
    ext: "webm",
    mime: "video/webm",
    kind: "video",
    check: (b) =>
      b.length > 4 &&
      b[0] === 0x1a &&
      b[1] === 0x45 &&
      b[2] === 0xdf &&
      b[3] === 0xa3,
  },
];

export async function POST(request: Request) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Dosya seçilmedi" }, { status: 400 });
    }

    if (file.size > MAX_VIDEO_SIZE) {
      return NextResponse.json(
        { error: "Dosya boyutu en fazla 40 MB olabilir" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const matched = MAGIC.find((m) => m.check(buffer));

    if (!matched) {
      return NextResponse.json(
        { error: "Sadece JPG, PNG, WebP, GIF, MP4 veya WebM yüklenebilir" },
        { status: 400 }
      );
    }

    const maxSize = matched.kind === "video" ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error:
            matched.kind === "video"
              ? "Video en fazla 40 MB olabilir"
              : "Görsel en fazla 8 MB olabilir",
        },
        { status: 400 }
      );
    }

    const prefix = matched.kind === "video" ? "product-video" : "product";
    const filename = `${prefix}-${Date.now()}-${randomBytes(4).toString("hex")}.${matched.ext}`;
    const uploadDir = path.join(process.cwd(), "public", "products", "uploads");

    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);

    return NextResponse.json({ url: `/products/uploads/${filename}`, filename });
  } catch (err) {
    console.error("[Upload]", err);
    return NextResponse.json(
      { error: "Görsel yüklenirken hata oluştu" },
      { status: 500 }
    );
  }
}
