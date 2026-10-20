import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ControlPage } from "./ControlPage";
import { snapshotFixture } from "../lib/snapshotFixture";

describe("ControlPage", () => {
  it("requires confirm before closing UPS output", async () => {
    const user = userEvent.setup();
    render(<ControlPage snapshot={snapshotFixture()} />);
    await user.click(screen.getByLabelText(/Close UPS output after delay/i));
    await user.click(screen.getByRole("button", { name: /Send command/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Confirm Close UPS output after delay/i)).toBeInTheDocument();
  });
});
