import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { dhashHex, sha256Hex } from "../hashes";

const gradient = async (format: "png" | "jpeg") => {
  // 64x64 left-to-right ramp: deterministic, non-trivial dHash.
  const raw = Buffer.alloc(64 * 64 * 3);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) raw.fill(x * 4, (y * 64 + x) * 3, (y * 64 + x) * 3 + 3);
  const s = sharp(raw, { raw: { width: 64, height: 64, channels: 3 } });
  return new Uint8Array(await (format === "png" ? s.png() : s.jpeg({ quality: 90 })).toBuffer());
};

describe("hashes", () => {
  it("sha256 is the hex digest of the bytes", () => {
    expect(sha256Hex(new Uint8Array([]))).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });
  it("dHash is 16 hex chars, equal for PNG and JPEG encodings of the same pixels", async () => {
    const a = await dhashHex(await gradient("png"));
    const b = await dhashHex(await gradient("jpeg"));
    expect(a).toMatch(/^[0-9a-f]{16}$/);
    expect(a).toBe(b);
    expect(a).toBe("ffffffffffffffff"); // every pixel brighter than its left neighbour
  });
  it("dHash is null for bytes sharp cannot decode", async () => {
    expect(await dhashHex(new Uint8Array([1, 2, 3]))).toBeNull();
  });
});
