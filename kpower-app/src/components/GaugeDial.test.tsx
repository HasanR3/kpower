import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { GaugeDial } from "./GaugeDial";

/** Mirror of GaugeDial polar math for assertions */
function tipAt(ratio: number) {
  const CX = 100;
  const CY = 108;
  const R = 72;
  const deg = 180 + 180 * ratio;
  const rad = (deg * Math.PI) / 180;
  return {
    x: CX + Math.cos(rad) * (R - 10),
    y: CY + Math.sin(rad) * (R - 10),
  };
}

describe("GaugeDial", () => {
  it("points needle left at 0%", () => {
    const { container } = render(<GaugeDial label="Load" value={0} />);
    const needle = container.querySelector(".gauge__needle")!;
    const expected = tipAt(0);
    expect(Number(needle.getAttribute("x2"))).toBeCloseTo(expected.x, 1);
    expect(Number(needle.getAttribute("y2"))).toBeCloseTo(expected.y, 1);
    expect(Number(needle.getAttribute("x2"))).toBeLessThan(100);
  });

  it("points needle up at 50%", () => {
    const { container } = render(<GaugeDial label="Load" value={50} />);
    const needle = container.querySelector(".gauge__needle")!;
    const expected = tipAt(0.5);
    expect(Number(needle.getAttribute("x2"))).toBeCloseTo(expected.x, 1);
    expect(Number(needle.getAttribute("y2"))).toBeCloseTo(expected.y, 1);
    expect(Number(needle.getAttribute("y2"))).toBeLessThan(108);
  });

  it("points needle right at 100%", () => {
    const { container } = render(<GaugeDial label="Battery" value={100} />);
    const needle = container.querySelector(".gauge__needle")!;
    const expected = tipAt(1);
    expect(Number(needle.getAttribute("x2"))).toBeCloseTo(expected.x, 1);
    expect(Number(needle.getAttribute("y2"))).toBeCloseTo(expected.y, 1);
    expect(Number(needle.getAttribute("x2"))).toBeGreaterThan(100);
  });

  it("fills arc dash to match ratio", () => {
    const { container } = render(<GaugeDial label="Battery" value={96} />);
    const fill = container.querySelector(".gauge__fill")!;
    expect(fill.getAttribute("stroke-dasharray")).toBe("96 100");
  });
});
