import { describe, expect, it } from "vitest";
import {
  clampRegion,
  coverageFraction,
  createStubLocalizer,
  padRegion,
  readLocalizerOutput,
  type Region,
} from "../regions";

/**
 * Region geometry is safety-critical in a way the classification verdict is
 * not. A wrong verdict withholds or shows a whole image; a wrong BOX shows
 * part of a woman while the viewer believes the filter worked. Everything here
 * is therefore biased toward covering too much, and toward giving up (which
 * falls back to withholding the whole image) rather than guessing.
 */

const box = (x: number, y: number, w: number, h: number): Region => ({
  x,
  y,
  width: w,
  height: h,
});

describe("padRegion", () => {
  it("grows a box on every side to absorb coordinate error", () => {
    const padded = padRegion(box(0.4, 0.4, 0.2, 0.2), 0.25);
    expect(padded.x).toBeCloseTo(0.35);
    expect(padded.y).toBeCloseTo(0.35);
    expect(padded.width).toBeCloseTo(0.3);
    expect(padded.height).toBeCloseTo(0.3);
  });

  it("never runs off the edge of the image", () => {
    const padded = padRegion(box(0, 0, 0.2, 0.2), 1);
    expect(padded.x).toBe(0);
    expect(padded.y).toBe(0);
    expect(padded.x + padded.width).toBeLessThanOrEqual(1);
    expect(padded.y + padded.height).toBeLessThanOrEqual(1);
  });
});

describe("clampRegion", () => {
  it("pulls a box that overhangs the frame back inside it", () => {
    const clamped = clampRegion(box(0.8, 0.8, 0.5, 0.5));
    expect(clamped.x + clamped.width).toBeCloseTo(1);
    expect(clamped.y + clamped.height).toBeCloseTo(1);
  });
});

describe("coverageFraction", () => {
  it("is zero for no regions", () => {
    expect(coverageFraction([])).toBe(0);
  });

  it("sums region areas", () => {
    expect(coverageFraction([box(0, 0, 0.5, 0.5), box(0.5, 0.5, 0.5, 0.5)])).toBeCloseTo(
      0.5
    );
  });

  it("overestimates when boxes overlap, and never exceeds the whole frame", () => {
    // Overestimating coverage makes the pipeline MORE likely to give up and
    // withhold the image, which is the safe direction to be wrong in.
    const overlapping = [box(0, 0, 0.8, 0.8), box(0.1, 0.1, 0.8, 0.8)];
    expect(coverageFraction(overlapping)).toBe(1);
  });
});

describe("readLocalizerOutput", () => {
  it("accepts well-formed normalized regions", () => {
    const out = readLocalizerOutput({
      regions: [{ x: 0.1, y: 0.2, width: 0.3, height: 0.4 }],
      found_all: true,
    });
    expect(out.regions).toHaveLength(1);
    expect(out.foundAll).toBe(true);
  });

  it("gives up entirely when any region is unreadable", () => {
    // Partial geometry is the dangerous case: three good boxes and one
    // garbled one would blur three women and quietly expose the fourth. An
    // unusable answer must fail whole, not in part.
    for (const bad of [
      { regions: [{ x: 0.1, y: 0.1, width: 2, height: 0.2 }], found_all: true },
      { regions: [{ x: -1, y: 0.1, width: 0.2, height: 0.2 }], found_all: true },
      { regions: [{ x: 0.1, y: 0.1, width: 0.2 }], found_all: true },
      { regions: [{ x: 0.1, y: 0.1, width: 0, height: 0.2 }], found_all: true },
      { regions: "lots", found_all: true },
      null,
    ]) {
      const out = readLocalizerOutput(bad);
      expect(out.regions).toEqual([]);
      expect(out.foundAll).toBe(false);
    }
  });

  it("treats a missing found_all as not found_all", () => {
    const out = readLocalizerOutput({
      regions: [{ x: 0.1, y: 0.1, width: 0.2, height: 0.2 }],
    });
    expect(out.foundAll).toBe(false);
  });

  it("reports no regions found as an empty, honest answer", () => {
    const out = readLocalizerOutput({ regions: [], found_all: true });
    expect(out.regions).toEqual([]);
    expect(out.foundAll).toBe(true);
  });
});

describe("createStubLocalizer", () => {
  it("returns configured regions without a network call", async () => {
    const stub = createStubLocalizer({
      regions: [box(0.1, 0.1, 0.2, 0.2)],
      foundAll: true,
    });
    const out = await stub.locate({
      mediaItemId: "m1",
      bytes: new Uint8Array([1]),
      contentType: "image/png",
    });
    expect(out.regions).toHaveLength(1);
    expect(stub.name).toBe("stub");
  });

  it("defaults to finding nothing, which falls back to withholding", async () => {
    const out = await createStubLocalizer().locate({
      mediaItemId: "m1",
      bytes: new Uint8Array([1]),
      contentType: "image/png",
    });
    expect(out).toEqual({ regions: [], foundAll: false });
  });
});
