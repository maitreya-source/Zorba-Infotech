import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import StateSelect from "@/components/admin/StateSelect";
import { DEFAULT_INDIAN_STATE, searchIndianStates, INDIAN_STATES } from "@/lib/constants";

describe("StateSelect Component & Indian States Dataset", () => {
  it("defaults to Madhya Pradesh (MP)", () => {
    expect(DEFAULT_INDIAN_STATE).toBe("Madhya Pradesh");
    const mp = INDIAN_STATES.find((s) => s.code === "MP");
    expect(mp).toBeDefined();
    expect(mp?.name).toBe("Madhya Pradesh");
  });

  it("finds Madhya Pradesh when typing 'MP' or 'mp'", () => {
    const results = searchIndianStates("mp");
    expect(results[0].name).toBe("Madhya Pradesh");
    expect(results[0].code).toBe("MP");
  });

  it("renders StateSelect with default value and allows typing to filter", () => {
    const onChange = vi.fn();
    render(<StateSelect value="Madhya Pradesh" onChange={onChange} />);

    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("Madhya Pradesh");

    // Open dropdown by focusing
    fireEvent.focus(input);
    expect(screen.getAllByText(/Madhya Pradesh/i).length).toBeGreaterThan(0);

    // Type query "del"
    fireEvent.change(input, { target: { value: "del" } });
    expect(onChange).toHaveBeenCalledWith("del");
  });

  it("selects a state when clicked from dropdown", () => {
    const onChange = vi.fn();
    render(<StateSelect value="" onChange={onChange} />);

    const toggleBtn = screen.getByTitle(/Toggle Indian states list/i);
    fireEvent.click(toggleBtn);

    // Click Gujarat (GJ)
    const gujaratOption = screen.getByRole("button", { name: /Gujarat/i });
    fireEvent.click(gujaratOption);

    expect(onChange).toHaveBeenCalledWith("Gujarat");
  });

  it("displays all Indian states when opening dropdown even if a state is already selected", () => {
    const onChange = vi.fn();
    render(<StateSelect value="Madhya Pradesh" onChange={onChange} />);

    const toggleBtn = screen.getByTitle(/Toggle Indian states list/i);
    fireEvent.click(toggleBtn);

    // Other states must be present and selectable, not just Madhya Pradesh!
    expect(screen.getByRole("button", { name: /Maharashtra/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Gujarat/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Delhi/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Rajasthan/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Uttar Pradesh/i })).toBeInTheDocument();
  });

  it("selects matching state when typing 2-letter code and pressing Enter", () => {
    const onChange = vi.fn();
    render(<StateSelect value="Madhya Pradesh" onChange={onChange} />);

    const input = screen.getByRole("textbox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "DL" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onChange).toHaveBeenLastCalledWith("Delhi");
    expect(input).toHaveValue("Delhi");
  });

  it("selects Madhya Pradesh when typing 'MP' and pressing Enter", () => {
    const onChange = vi.fn();
    render(<StateSelect value="" onChange={onChange} />);

    const input = screen.getByRole("textbox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "MP" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onChange).toHaveBeenLastCalledWith("Madhya Pradesh");
    expect(input).toHaveValue("Madhya Pradesh");
  });

  it("clears state when clicking the Clear (X) button", () => {
    const onChange = vi.fn();
    render(<StateSelect value="Maharashtra" onChange={onChange} />);

    const clearBtn = screen.getByTitle(/Clear state/i);
    fireEvent.click(clearBtn);

    expect(onChange).toHaveBeenCalledWith("");
    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("");
  });
});

