import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Input } from "@/components/ui/input";

describe("Number Input Protection", () => {
  it("prevents ArrowUp and ArrowDown from altering number input values", () => {
    render(<Input type="number" defaultValue="600" />);
    const input = screen.getByRole("spinbutton");

    // In @testing-library/react, fireEvent returns false if event.preventDefault() was invoked
    const upEvent = fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(upEvent).toBe(false);

    const downEvent = fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(downEvent).toBe(false);

    // Other keys like Tab or numbers should not be prevented
    const tabEvent = fireEvent.keyDown(input, { key: "Tab" });
    expect(tabEvent).toBe(true);
  });

  it("does not prevent ArrowUp/ArrowDown on text inputs", () => {
    render(<Input type="text" defaultValue="test" />);
    const input = screen.getByRole("textbox");

    const upEvent = fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(upEvent).toBe(true);
  });

  it("blurs on mouse wheel when focused to prevent accidental scroll changing values", () => {
    render(<Input type="number" defaultValue="600" />);
    const input = screen.getByRole("spinbutton");
    input.focus();
    expect(document.activeElement).toBe(input);

    fireEvent.wheel(input);
    expect(document.activeElement).not.toBe(input);
  });
});
