export const IMAGE_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
export const VIDEO_UPLOAD_MAX_BYTES = 40 * 1024 * 1024;

export type DetectedUpload = {
  kind: "image" | "video";
  ext: string;
  mime: string;
};

function isMp4(buffer: Buffer): boolean {
  return buffer.length > 12 && buffer.toString("ascii", 4, 8) === "ftyp";
}

function isWebm(buffer: Buffer): boolean {
  return (
    buffer.length > 4 &&
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  );
}

export function detectUpload(buffer: Buffer): DetectedUpload | null {
  if (buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { kind: "image", ext: "jpg", mime: "image/jpeg" };
  }
  if (
    buffer.length > 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return { kind: "image", ext: "png", mime: "image/png" };
  }
  if (
    buffer.length > 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { kind: "image", ext: "webp", mime: "image/webp" };
  }
  if (
    buffer.length > 6 &&
    (buffer.toString("ascii", 0, 6) === "GIF87a" ||
      buffer.toString("ascii", 0, 6) === "GIF89a")
  ) {
    return { kind: "image", ext: "gif", mime: "image/gif" };
  }
  if (isMp4(buffer)) {
    return { kind: "video", ext: "mp4", mime: "video/mp4" };
  }
  if (isWebm(buffer)) {
    return { kind: "video", ext: "webm", mime: "video/webm" };
  }
  return null;
}

export function isSafeProductImage(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\/products\/(?:uploads\/)?[a-zA-Z0-9._-]+$/.test(value) &&
    !/\.(mp4|webm|mov|m4v)$/i.test(value)
  );
}

export function isSafeProductVideo(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\/products\/uploads\/[a-zA-Z0-9._-]+\.(mp4|webm)$/i.test(value)
  );
}

export function resolveProductVideo(
  input: unknown,
  fallback?: string | null
): string | null {
  if (input === undefined) return fallback ?? null;
  if (input === "" || input === null) return null;
  if (isSafeProductVideo(input)) return input;
  return fallback ?? null;
}

export function isSafeStoryMedia(value: unknown): value is string {
  return isSafeProductImage(value) || isSafeProductVideo(value);
}

export function storyMediaKind(url: string): "image" | "video" {
  return /\.(mp4|webm)$/i.test(url) ? "video" : "image";
}

export function clampStoryDuration(value: unknown, fallback = 5): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(15, Math.max(3, Math.round(n)));
}
