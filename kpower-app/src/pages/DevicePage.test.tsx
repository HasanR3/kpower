import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DevicePage } from "./DevicePage";
import type { UpsSnapshot } from "../lib/types";

const disconnected: UpsSnapshot = {
  connected: false,
  mode: "unknown",
  loadPercent: 0,
  batteryPercent: 0,
  runtimeSeconds: 0,
  inputVoltage: 0,
  outputVoltage: 0,
  frequency: 0,
  temperatureC: 0,
  alarmCodes: [],
  timestampMs: 1,
};

describe("DevicePage", () => {
  it("DevicePage_shows_reconnect_cta_when_disconnected", () => {
    render(<DevicePage snapshot={disconnected} />);
    expect(screen.getByText("UPS not connected")).toBeInTheDocument();
  });
});
