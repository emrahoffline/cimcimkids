import "server-only";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import {
  REVIEW_IMAGE_MAX,
  REVIEW_IMAGE_MAX_BYTES,
  sanitizeReviewImages,
} from "./reviews";

const MAGIC: Array<{ ext: string; check: (b: Buffer) => boolean }> = [
  {
    ext: "jpg",
    check: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    ext: "png",
    check: (b) =>
      b.length > 8 &&
      b[0] === 0x89 &&
      b[1] === 0x50 &&
      b[2] === 0x4e &&
      b[3] === 0x47,
  },
  {
    ext: "webp",
    check: (b) =>
      b.length > 12 &&
      b.toString("ascii", 0, 4) === "RIFF" &&
      b.toString("ascii", 8, 12) === "WEBP",
  },
];

export async function saveReviewPhotoFiles(
  files: File[]
): Promise<{ ok: true; urls: string[] } | { ok: false; error: string }> {
  if (files.length > REVIEW_IMAGE_MAX) {
    return { ok: false, error: "TOO_MANY_IMAGES" };
  }

  const uploadDir = path.join(
    process.cwd(),
    "public",
    "products",
    "uploads",
    "reviews"
  );
  await mkdir(uploadDir, { recursive: true });

  const written: string[] = [];
  const urls: string[] = [];

  try {
    for (const file of files) {
      if (file.size <= 0 || file.size > REVIEW_IMAGE_MAX_BYTES) {
        throw new Error("IMAGE_TOO_LARGE");
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const matched = MAGIC.find((m) => m.check(buffer));
      if (!matched) throw new Error("INVALID_IMAGE");

      const filename = `review-${Date.now()}-${randomBytes(4).toString("hex")}.${matched.ext}`;
      const full = path.join(uploadDir, filename);
      await writeFile(full, buffer);
      written.push(full);
      urls.push(`/products/uploads/reviews/${filename}`);
    }
    return { ok: true, urls };
  } catch (err) {
    await Promise.all(written.map((filePath) => unlink(filePath).catch(() => undefined)));
    const message = err instanceof Error ? err.message : "INVALID_IMAGE";
    if (message === "IMAGE_TOO_LARGE" || message === "INVALID_IMAGE") {
      return { ok: false, error: message };
    }
    return { ok: false, error: "INVALID_IMAGE" };
  }
}

export async function deleteReviewImageFiles(urls: string[]): Promise<void> {
  const safe = sanitizeReviewImages(urls);
  await Promise.all(
    safe.map((url) => {
      const filename = path.basename(url);
      const full = path.join(
        process.cwd(),
        "public",
        "products",
        "uploads",
        "reviews",
        filename
      );
      return unlink(full).catch(() => undefined);
    })
  );
}
