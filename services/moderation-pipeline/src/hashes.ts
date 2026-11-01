import { createHash } from "node:crypto";
import sharp from "sharp";

export interface MediaHashes {
  sha256: string;
  /** 64-bit difference hash as 16 hex chars; null when the bytes do not decode. */
  dhash: string | null;
}

export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * dHash: grayscale, 9x8, each bit = "pixel brighter than its left neighbour".
 * Survives re-encoding and EXIF rotation (sharp applies orientation), which is
 * what a re-uploaded screenshot or forwarded photo looks like. Equality only —
 * no distance search (ADR 0019).
 */
export async function dhashHex(bytes: Uint8Array): Promise<string | null> {
  try {
    const px = await sharp(Buffer.from(bytes), { animated: false })
      .rotate()
      .grayscale()
      .resize(9, 8, { fit: "fill" })
      .raw()
      .toBuffer();
    let bits = 0n;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        bits = (bits << 1n) | (px[r * 9 + c + 1]! > px[r * 9 + c]! ? 1n : 0n);
      }
    }
    return bits.toString(16).padStart(16, "0");
  } catch {
    return null;
  }
}

export async function hashMedia(bytes: Uint8Array): Promise<MediaHashes> {
  return { sha256: sha256Hex(bytes), dhash: await dhashHex(bytes) };
}
