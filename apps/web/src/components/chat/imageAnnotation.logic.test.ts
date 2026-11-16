import { describe, expect, it } from "vite-plus/test";

import {
  annotatedFileName,
  arrowHeadPoints,
  isMeaningfulAnnotation,
} from "./imageAnnotation.logic";

describe("arrowHeadPoints", () => {
  it("places both barbs behind the tip, mirrored across the shaft", () => {
    const head = arrowHeadPoints({ x: 0, y: 0 }, { x: 100, y: 0 }, 4);
    expect(head).not.toBeNull();
    const [a, b] = head!;
    expect(a.x).toBeCloseTo(b.x);
    expect(a.x).toBeLessThan(100);
    expect(a.y).toBeCloseTo(-b.y);
    expect(Math.abs(a.y)).toBeGreaterThan(0);
  });

  it("keeps the head shorter than a short arrow and skips a zero-length one", () => {
    const [a] = arrowHeadPoints({ x: 0, y: 0 }, { x: 10, y: 0 }, 10)!;
    expect(a.x).toBeGreaterThan(0);
    expect(arrowHeadPoints({ x: 5, y: 5 }, { x: 5, y: 5 }, 4)).toBeNull();
  });
});

describe("isMeaningfulAnnotation", () => {
  it("drops clicks without a drag and blank text", () => {
    const at = { x: 1, y: 1 };
    expect(isMeaningfulAnnotation({ kind: "pen", color: "#000", width: 3, points: [at] })).toBe(
      false,
    );
    expect(
      isMeaningfulAnnotation({ kind: "rect", color: "#000", width: 3, from: at, to: at }),
    ).toBe(false);
    expect(
      isMeaningfulAnnotation({ kind: "text", color: "#000", fontSize: 20, at, text: " " }),
    ).toBe(false);
    expect(
      isMeaningfulAnnotation({
        kind: "arrow",
        color: "#000",
        width: 3,
        from: at,
        to: { x: 40, y: 1 },
      }),
    ).toBe(true);
  });
});

describe("annotatedFileName", () => {
  it.each<[string, string]>([
    ["screenshot.jpg", "screenshot-annotated.png"],
    ["screenshot-annotated.png", "screenshot-annotated.png"],
    ["archive.tar.gz", "archive.tar-annotated.png"],
    ["", "image-annotated.png"],
  ])("%s → %s", (name, expected) => {
    expect(annotatedFileName(name)).toBe(expected);
  });
});
