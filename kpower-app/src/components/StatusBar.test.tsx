import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBar } from "./StatusBar";

describe("StatusBar", () => {
  it("StatusBar shows Disconnected when snapshot null", () => {
    render(<StatusBar snapshot={null} />);
    expect(screen.getByText("Disconnected")).toBeInTheDocument();
  });
});
