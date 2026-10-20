import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ControlPage } from "./ControlPage";
import type { UpsSnapshot } from "../lib/types";

const connected: UpsSnapshot = {
  connected: true,
  mode: "line",
  loadPercent: 20,
  batteryPercent: 90,
  runtimeSeconds: 4000,
  inputVoltage: 230,
  outputVoltage: 229,
  frequency: 50,
  temperatureC: 28,
  alarmCodes: [],
  timestampMs: 1,
};

describe("ControlPage", () => {
  it("requires confirm before closing UPS output", async () => {
    const user = userEvent.setup();
    render(<ControlPage snapshot={connected} />);
    await user.click(screen.getByLabelText(/Close UPS output after delay/i));
    await user.click(screen.getByRole("button", { name: /Send command/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Confirm Close UPS output after delay/i)).toBeInTheDocument();
  });
});
