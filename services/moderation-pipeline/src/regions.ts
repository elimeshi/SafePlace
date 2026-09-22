/**
 * Region geometry for the redaction pass.
 *
 * Coordinates are NORMALIZED to 0..1 rather than pixels, deliberately. The
 * vision API scales oversized images down before the model sees them and does
 * not report the dimensions it used, so a pixel box would be expressed in a
 * coordinate system we cannot reconstruct. Normalized coordinates survive any
 * aspect-preserving scale.
 *
 * Everything here is biased in one direction. A wrong classification verdict
 * withholds or shows a whole image; a wrong BOX shows part of a woman while
 * the viewer believes the filter worked. So boxes are padded outward, overlap
 * is overestimated, and any answer that cannot be read in full is discarded in
 * full — which falls back to withholding the original, the behaviour we had
 * before blurring existed.
 */
import type { ClassifierInput } from "./classifier";

/** A box in normalized image coordinates: 0..1 on both axes, origin top-left. */
export interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LocalizerOutput {
  regions: Region[];
  /** The model's own claim that it found every woman in the frame. */
  foundAll: boolean;
}

export interface RegionLocalizer {
  readonly name: string;
  locate(input: ClassifierInput): Promise<LocalizerOutput>;
}

const EMPTY: LocalizerOutput = { regions: [], foundAll: false };

function isUnitInterval(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

/** Pull a box back inside the frame, preserving as much of it as fits. */
export function clampRegion(region: Region): Region {
  const x = Math.min(Math.max(region.x, 0), 1);
  const y = Math.min(Math.max(region.y, 0), 1);
  return {
    x,
    y,
    width: Math.min(Math.max(region.width, 0), 1 - x),
    height: Math.min(Math.max(region.height, 0), 1 - y),
  };
}

/**
 * Grow a box by `fraction` of its own size on EACH side — so a fraction of
 * 0.25 makes the box half as wide again overall. This absorbs the imprecision
 * of a vision model's coordinates: a box that is 15% too small leaves an edge
 * of the subject visible, which is the failure this exists to prevent.
 */
export function padRegion(region: Region, fraction: number): Region {
  const padX = region.width * fraction;
  const padY = region.height * fraction;
  return clampRegion({
    x: region.x - padX,
    y: region.y - padY,
    width: region.width + padX * 2,
    height: region.height + padY * 2,
  });
}

/**
 * How much of the frame the regions cover. Overlapping boxes are counted
 * twice, so this OVERSTATES coverage — the safe direction, because a high
 * coverage figure makes the pipeline abandon blurring and withhold the image
 * instead.
 */
export function coverageFraction(regions: Region[]): number {
  const total = regions.reduce((sum, r) => sum + r.width * r.height, 0);
  return Math.min(total, 1);
}

/**
 * Read a localizer response. Any unreadable region discards the WHOLE answer:
 * three good boxes and one garbled one would blur three women and quietly
 * expose the fourth, which is worse than not blurring at all.
 */
export function readLocalizerOutput(raw: unknown): LocalizerOutput {
  if (raw === null || typeof raw !== "object") return EMPTY;

  const { regions, found_all: foundAll } = raw as {
    regions?: unknown;
    found_all?: unknown;
  };
  if (!Array.isArray(regions)) return EMPTY;

  const parsed: Region[] = [];
  for (const candidate of regions) {
    if (candidate === null || typeof candidate !== "object") return EMPTY;
    const { x, y, width, height } = candidate as Record<string, unknown>;
    if (!isUnitInterval(x) || !isUnitInterval(y)) return EMPTY;
    if (!isUnitInterval(width) || !isUnitInterval(height)) return EMPTY;
    // A zero-area box is not a location; it is a malformed answer.
    if (width === 0 || height === 0) return EMPTY;
    if (x + width > 1 || y + height > 1) return EMPTY;
    parsed.push({ x, y, width, height });
  }

  return { regions: parsed, foundAll: foundAll === true };
}

export interface StubLocalizerOptions {
  regions?: Region[];
  foundAll?: boolean;
  byMediaItemId?: Record<string, LocalizerOutput>;
}

/**
 * Offline localizer for tests and development. Defaults to finding nothing and
 * not claiming completeness, so the pipeline falls back to withholding rather
 * than to a confidently empty blur.
 */
export function createStubLocalizer(
  options: StubLocalizerOptions = {}
): RegionLocalizer {
  const fallback: LocalizerOutput = {
    regions: options.regions ?? [],
    foundAll: options.foundAll ?? false,
  };
  return {
    name: "stub",
    locate: async ({ mediaItemId }) =>
      options.byMediaItemId?.[mediaItemId] ?? fallback,
  };
}
