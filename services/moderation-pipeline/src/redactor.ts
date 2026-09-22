/**
 * Server-side redaction of the regions a localizer reported.
 *
 * Two properties this must have, both of which shaped the implementation:
 *
 * 1. **It happens on the server, into a separate stored object.** Handing a
 *    client the original plus a set of coordinates and asking it to blur them
 *    is not redaction — it is a suggestion, reversible in a devtools panel.
 * 2. **It is irreversible.** A light Gaussian blur is substantially
 *    recoverable by deconvolution. So each region is resampled down to a
 *    handful of pixels and blown back up, which discards the information
 *    rather than smearing it, and a blur is applied on top to remove the
 *    hard mosaic edges.
 */
import sharp from "sharp";
import type { OverlayOptions } from "sharp";
import { clampRegion, type Region } from "./regions";

export interface ImageRedactor {
  /** Returns NEW image bytes with every region covered. */
  redact(
    bytes: Uint8Array,
    regions: Region[],
    contentType: string
  ): Promise<Uint8Array>;
}

export interface SharpRedactorOptions {
  /**
   * Width, in pixels, that each region is resampled down to before being
   * scaled back up. Smaller destroys more. 8 leaves shape and colour — enough
   * to see that something was covered — and no recoverable detail.
   */
  mosaicWidth?: number;
}

const DEFAULT_MOSAIC_WIDTH = 8;

function toPixels(region: Region, width: number, height: number) {
  const r = clampRegion(region);
  const left = Math.floor(r.x * width);
  const top = Math.floor(r.y * height);
  // Round outward: a region that lands between pixels should cover the extra
  // pixel, not leave it.
  const right = Math.min(width, Math.ceil((r.x + r.width) * width));
  const bottom = Math.min(height, Math.ceil((r.y + r.height) * height));
  return { left, top, width: right - left, height: bottom - top };
}

export function createSharpRedactor(
  options: SharpRedactorOptions = {}
): ImageRedactor {
  const mosaicWidth = options.mosaicWidth ?? DEFAULT_MOSAIC_WIDTH;

  return {
    async redact(bytes, regions, _contentType): Promise<Uint8Array> {
      if (regions.length === 0) {
        // Never emit a "redacted" derivative that redacts nothing: it would be
        // a file that looks safe and is not.
        throw new Error("redact: no regions to cover");
      }

      const source = sharp(Buffer.from(bytes));
      const meta = await source.metadata();
      const width = meta.width;
      const height = meta.height;
      if (!width || !height) {
        throw new Error("redact: could not read image dimensions");
      }

      const overlays: OverlayOptions[] = [];
      for (const region of regions) {
        const area = toPixels(region, width, height);
        if (area.width <= 0 || area.height <= 0) continue;

        const patch = await sharp(Buffer.from(bytes))
          .extract(area)
          // Down, then back up: the detail is discarded, not blurred.
          .resize(mosaicWidth, Math.max(1, Math.round((mosaicWidth * area.height) / area.width)), {
            fit: "fill",
          })
          .resize(area.width, area.height, { fit: "fill", kernel: "nearest" })
          .blur(Math.max(2, Math.round(Math.min(area.width, area.height) / 12)))
          .toBuffer();

        overlays.push({ input: patch, left: area.left, top: area.top });
      }

      if (overlays.length === 0) {
        throw new Error("redact: no regions to cover");
      }

      const out = await sharp(Buffer.from(bytes)).composite(overlays).png().toBuffer();
      return new Uint8Array(out);
    },
  };
}
