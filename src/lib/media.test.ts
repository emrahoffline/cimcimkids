import assert from "node:assert/strict";
import {
  detectUpload,
  isSafeProductImage,
  isSafeProductVideo,
  resolveProductVideo,
  isSafeStoryMedia,
  storyMediaKind,
  clampStoryDuration,
} from "./media";

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
assert.equal(detectUpload(jpeg)?.kind, "image");
assert.equal(detectUpload(jpeg)?.ext, "jpg");

const mp4 = Buffer.alloc(16);
mp4.write("ftyp", 4, "ascii");
mp4.write("isom", 8, "ascii");
assert.equal(detectUpload(mp4)?.kind, "video");
assert.equal(detectUpload(mp4)?.ext, "mp4");

const webm = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x00, 0x00]);
assert.equal(detectUpload(webm)?.kind, "video");
assert.equal(detectUpload(webm)?.ext, "webm");

assert.equal(detectUpload(Buffer.from("hello")), null);

assert.equal(isSafeProductImage("/products/uploads/photo.jpg"), true);
assert.equal(isSafeProductImage("/products/uploads/clip.mp4"), false);
assert.equal(isSafeProductVideo("/products/uploads/clip.mp4"), true);
assert.equal(isSafeProductVideo("/products/clip.mp4"), false);
assert.equal(isSafeProductVideo("https://evil.example/x.mp4"), false);

assert.equal(resolveProductVideo(undefined, "/products/uploads/old.mp4"), "/products/uploads/old.mp4");
assert.equal(resolveProductVideo(""), null);
assert.equal(resolveProductVideo("/products/uploads/new.webm"), "/products/uploads/new.webm");
assert.equal(
  resolveProductVideo("/tmp/x.mp4", "/products/uploads/old.mp4"),
  "/products/uploads/old.mp4"
);

assert.equal(isSafeStoryMedia("/products/uploads/photo.jpg"), true);
assert.equal(isSafeStoryMedia("/products/uploads/clip.mp4"), true);
assert.equal(isSafeStoryMedia("https://evil.example/x.mp4"), false);
assert.equal(storyMediaKind("/products/uploads/clip.webm"), "video");
assert.equal(storyMediaKind("/products/uploads/photo.jpg"), "image");
assert.equal(clampStoryDuration(20), 15);
assert.equal(clampStoryDuration(1), 3);
assert.equal(clampStoryDuration("abc"), 5);

console.log("media tests passed");
