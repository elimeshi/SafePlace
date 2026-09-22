import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { createSharpRedactor } from "../redactor";
import type { Region } from "../regions";

/**
 * Redaction is tested against real pixels, because the property that matters
 * cannot be asserted against a mock: the covered area must no longer carry the
 * information it did. A blur that runs without error and leaves a recognisable
 * subject is the exact failure this feature must not have.
 */

/** A 100x100 image: left half red, right half blue, with fine detail. */
async function testImage(): Promise<Uint8Array> {
  const pixels = Buffer.alloc(100 * 100 * 3);
  for (let y = 0; y < 100; y += 1) {
    for (let x = 0; x < 100; x += 1) {
      const i = (y * 100 + x) * 3;
      const stripe = (x + y) % 2 === 0 ? 255 : 0;
      if (x < 50) {
        pixels[i] = stripe;
        pixels[i + 1] = 0;
        pixels[i + 2] = 0;
      } else {
        pixels[i] = 0;
        pixels[i + 1] = 0;
        pixels[i + 2] = stripe;
      }
    }
  }
  const png = await sharp(pixels, { raw: { width: 100, height: 100, channels: 3 } })
    .png()
    .toBuffer();
  return new Uint8Array(png);
}

async function rawPixels(bytes: Uint8Array) {
  const { data, info } = await sharp(Buffer.from(bytes))
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, info };
}

/** Spread of values in a box — near zero means the detail is gone. */
function varianceIn(
  data: Buffer,
  width: number,
  channels: number,
  box: { x0: number; y0: number; x1: number; y1: number }
): number {
  const values: number[] = [];
  for (let y = box.y0; y < box.y1; y += 1) {
    for (let x = box.x0; x < box.x1; x += 1) {
      values.push(data[(y * width + x) * channels] ?? 0);
    }
  }
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
}

const leftHalf: Region = { x: 0, y: 0, width: 0.5, height: 1 };

describe("createSharpRedactor", () => {
  it("destroys detail inside the region", async () => {
    const original = await testImage();
    const redactor = createSharpRedactor();

    const before = await rawPixels(original);
    const after = await rawPixels(
      await redactor.redact(original, [leftHalf], "image/png")
    );

    const box = { x0: 5, y0: 5, x1: 45, y1: 95 };
    const beforeVariance = varianceIn(before.data, 100, before.info.channels, box);
    const afterVariance = varianceIn(after.data, 100, after.info.channels, box);

    expect(beforeVariance).toBeGreaterThan(1000);
    // Not merely "different" — the alternating detail must be gone, which is
    // what makes the redaction irreversible rather than a soft blur.
    expect(afterVariance).toBeLessThan(beforeVariance / 20);
  });

  it("leaves everything outside the region alone", async () => {
    const original = await testImage();
    const after = await createSharpRedactor().redact(original, [leftHalf], "image/png");

    const before = await rawPixels(original);
    const redacted = await rawPixels(after);
    const box = { x0: 60, y0: 5, x1: 95, y1: 95 };

    expect(varianceIn(redacted.data, 100, redacted.info.channels, box)).toBeCloseTo(
      varianceIn(before.data, 100, before.info.channels, box),
      0
    );
  });

  it("keeps the image's dimensions", async () => {
    const after = await createSharpRedactor().redact(
      await testImage(),
      [leftHalf],
      "image/png"
    );
    const meta = await sharp(Buffer.from(after)).metadata();
    expect(meta.width).toBe(100);
    expect(meta.height).toBe(100);
  });

  it("covers several regions at once", async () => {
    const regions: Region[] = [
      { x: 0, y: 0, width: 0.3, height: 0.3 },
      { x: 0.6, y: 0.6, width: 0.3, height: 0.3 },
    ];
    const after = await createSharpRedactor().redact(
      await testImage(),
      regions,
      "image/png"
    );
    const { data, info } = await rawPixels(after);
    expect(
      varianceIn(data, 100, info.channels, { x0: 2, y0: 2, x1: 28, y1: 28 })
    ).toBeLessThan(500);
    expect(
      varianceIn(data, 100, info.channels, { x0: 62, y0: 62, x1: 88, y1: 88 })
    ).toBeLessThan(500);
  });

  it("refuses to produce a derivative with nothing redacted", async () => {
    // Returning the original unchanged would create a file that looks like a
    // safe derivative and is not one.
    await expect(
      createSharpRedactor().redact(await testImage(), [], "image/png")
    ).rejects.toThrow(/no regions/i);
  });
});
