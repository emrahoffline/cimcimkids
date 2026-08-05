import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { requireAdminApi } from "@/lib/admin-api";
import { randomBytes } from "crypto";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const MAGIC: Array<{ ext: string; mime: string; check: (b: Buffer) => boolean }> = [
  {
    ext: "jpg",
    mime: "image/jpeg",
    check: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    ext: "png",
    mime: "image/png",
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
    check: (b) =>
      b.length > 12 &&
      b.toString("ascii", 0, 4) === "RIFF" &&
      b.toString("ascii", 8, 12) === "WEBP",
  },
  {
    ext: "gif",
    mime: "image/gif",
    check: (b) =>
      b.length > 6 &&
      (b.toString("ascii", 0, 6) === "GIF87a" ||
        b.toString("ascii", 0, 6) === "GIF89a"),
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

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Dosya boyutu en fazla 5 MB olabilir" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const matched = MAGIC.find((m) => m.check(buffer));

    if (!matched) {
      return NextResponse.json(
        { error: "Sadece geçerli JPG, PNG, WebP veya GIF yüklenebilir" },
        { status: 400 }
      );
    }

    // Content-Type istemciye güvenmeden magic ile eşleşmeli (yoksa yine de magic ext kullan)
    if (file.type && file.type !== matched.mime && file.type !== "image/jpeg") {
      // jpeg alias
      if (!(matched.ext === "jpg" && file.type === "image/jpg")) {
        // soft check only — bytes win
      }
    }

    const filename = `product-${Date.now()}-${randomBytes(4).toString("hex")}.${matched.ext}`;
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
