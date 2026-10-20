import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ControlPage } from "./ControlPage";
import { DEFAULT_SETTINGS, saveSettings } from "../lib/appData";
import { snapshotFixture } from "../lib/snapshotFixture";

describe("ControlPage", () => {
  beforeEach(() => {
    localStorage.clear();
    saveSettings({ ...DEFAULT_SETTINGS, allowControl: true });
  });

  afterEach(() => {
    cleanup();
  });

  it("requires confirm before closing UPS output when control is allowed", async () => {
    const user = userEvent.setup();
    render(<ControlPage snapshot={snapshotFixture()} />);
    await user.click(screen.getByLabelText(/Close UPS output after delay/i));
    await user.click(screen.getByRole("button", { name: /Send command/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Confirm Close UPS output after delay/i)).toBeInTheDocument();
  });

  it("keeps Send disabled when allowControl is off", () => {
    saveSettings({ ...DEFAULT_SETTINGS, allowControl: false });
    render(<ControlPage snapshot={snapshotFixture()} />);
    expect(screen.getByRole("button", { name: /Send command/i })).toBeDisabled();
  });
});
