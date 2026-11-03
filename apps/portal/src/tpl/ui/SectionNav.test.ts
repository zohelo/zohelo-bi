import { describe, expect, it } from "vitest";
import { activeTarget } from "./SectionNav";

describe("section navigation: scroll-spy", () => {
  it("marks the last section whose top has passed under the sticky header", () => {
    expect(activeTarget([200, 900, 1600], 240, false)).toBe(0);
    expect(activeTarget([-500, 100, 800], 240, false)).toBe(1);
    expect(activeTarget([-1500, -700, 230], 240, false)).toBe(2);
  });
  it("marks the first section before any has reached the header", () => {
    expect(activeTarget([400, 900], 240, false)).toBe(0);
  });
  it("marks the last section at the end of the page, even when it is too short to reach the header", () => {
    expect(activeTarget([-900, -200, 500], 240, true)).toBe(2);
  });
  it("returns -1 with no sections", () => {
    expect(activeTarget([], 240, false)).toBe(-1);
  });
});
