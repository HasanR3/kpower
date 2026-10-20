import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DevicePage } from "./DevicePage";
import { snapshotFixture } from "../lib/snapshotFixture";

afterEach(() => cleanup());

describe("DevicePage", () => {
  it("DevicePage_shows_reconnect_cta_when_disconnected", () => {
    render(
      <DevicePage
        snapshot={snapshotFixture({
          connected: false,
          mode: "unknown",
          loadPercent: 0,
          batteryPercent: 0,
          runtimeSeconds: 0,
          inputVoltage: 0,
          outputVoltage: 0,
          frequency: 0,
          batterySingleVoltage: 0,
          temperatureC: 0,
        })}
      />,
    );
    expect(screen.getByText("UPS not connected")).toBeInTheDocument();
  });

  it("Data tab shows stock KPower electrical fields", async () => {
    const user = userEvent.setup();
    const { container } = render(<DevicePage snapshot={snapshotFixture()} />);
    const tab = within(container).getByRole("tab", { name: "Data" });
    await user.click(tab);
    expect(within(container).getByText("Input voltage")).toBeInTheDocument();
    expect(within(container).getByText("Output voltage")).toBeInTheDocument();
    expect(within(container).getByText("Input frequency")).toBeInTheDocument();
    expect(within(container).getByText("Battery single voltage")).toBeInTheDocument();
    expect(within(container).getByText("UPS load")).toBeInTheDocument();
    expect(within(container).getByText("Temperature")).toBeInTheDocument();
    expect(within(container).getByText("2.26")).toBeInTheDocument();
    expect(within(container).getByText("50.0")).toBeInTheDocument();
  });
});
