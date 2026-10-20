import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { GaugeDial } from "./GaugeDial";

const CX = 120;
const CY = 118;
const R = 88;
const START = 150;
const SWEEP = 240;

function tipAt(ratio: number) {
  const deg = START + SWEEP * ratio;
  const rad = (deg * Math.PI) / 180;
  return {
    x: CX + Math.cos(rad) * (R - 14),
    y: CY + Math.sin(rad) * (R - 14),
  };
}

function needleCenterlineTip(points: string) {
  // Average of the two tip vertices (blade width offset)
  const verts = points.split(" ").map((p) => p.split(",").map(Number));
  return {
    x: (verts[0][0] + verts[1][0]) / 2,
    y: (verts[0][1] + verts[1][1]) / 2,
  };
}

describe("GaugeDial", () => {
  it("renders instrument value and status for load", () => {
    render(<GaugeDial label="UPS load" value={33} variant="load" />);
    expect(screen.getByLabelText(/UPS load: 33/i)).toBeInTheDocument();
    expect(screen.getByText("Nominal load")).toBeInTheDocument();
  });

  it("points needle toward top at 50%", () => {
    const { container } = render(<GaugeDial label="Load" value={50} />);
    const needle = container.querySelector(".gauge__needle")!;
    const tip = needleCenterlineTip(needle.getAttribute("points")!);
    const expected = tipAt(0.5);
    expect(tip.x).toBeCloseTo(expected.x, 0);
    expect(tip.y).toBeCloseTo(expected.y, 0);
    expect(tip.y).toBeLessThan(CY);
  });

  it("points needle lower-right at 100%", () => {
    const { container } = render(<GaugeDial label="Battery" value={100} variant="battery" />);
    const needle = container.querySelector(".gauge__needle")!;
    const tip = needleCenterlineTip(needle.getAttribute("points")!);
    const expected = tipAt(1);
    expect(tip.x).toBeCloseTo(expected.x, 0);
    expect(tip.y).toBeCloseTo(expected.y, 0);
    expect(tip.x).toBeGreaterThan(CX);
  });

  it("fills arc dash to match ratio", () => {
    const { container } = render(<GaugeDial label="Battery" value={96} variant="battery" />);
    const fill = container.querySelector(".gauge__fill")!;
    expect(fill.getAttribute("stroke-dasharray")).toBe("96 100");
  });

  it("flags critical battery reserve", () => {
    render(<GaugeDial label="Battery capacity" value={12} variant="battery" />);
    expect(screen.getByText("Critical reserve")).toBeInTheDocument();
  });
});
