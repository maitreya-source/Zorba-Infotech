import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useRef, useState } from "react";
import { useTallyListNavigation, useTallyFormNavigation } from "@/hooks/useTallyKeyboard";

function ListNavigationTestComponent({
  itemCount = 6,
  columns = 3,
  onOpenItem,
  onWhatsAppItem,
}: {
  itemCount?: number;
  columns?: number;
  onOpenItem?: (index: number) => void;
  onWhatsAppItem?: (index: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const items = Array.from({ length: itemCount }, (_, i) => ({ id: i, name: `Item ${i}` }));
  const { selectedIndex, setSelectedIndex } = useTallyListNavigation({
    items,
    containerRef,
    columns,
    onOpenItem: (_item, idx) => onOpenItem?.(idx),
    onWhatsAppItem: (_item, idx) => onWhatsAppItem?.(idx),
    enabled: true,
  });

  return (
    <div ref={containerRef} data-testid="container">
      {Array.from({ length: itemCount }, (_, i) => (
        <div
          key={i}
          data-tally-row={i}
          data-selected={selectedIndex === i}
          onClick={() => setSelectedIndex(i)}
        >
          Item {i} {selectedIndex === i ? "(Selected)" : ""}
        </div>
      ))}
    </div>
  );
}

function FormNavigationTestComponent({
  onSave,
}: {
  onSave: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [val1, setVal1] = useState("");
  const [val2, setVal2] = useState("");

  useTallyFormNavigation({
    formRef,
    onSave,
    enabled: true,
  });

  return (
    <form ref={formRef} data-testid="form" onSubmit={(e) => { e.preventDefault(); onSave(); }}>
      <input
        data-testid="input-1"
        value={val1}
        onChange={(e) => setVal1(e.target.value)}
      />
      <input
        data-testid="input-2"
        value={val2}
        onChange={(e) => setVal2(e.target.value)}
      />
      <button type="submit" data-testid="submit-btn">Save</button>
    </form>
  );
}

describe("useTallyKeyboard Hook Navigation & Shortcuts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("navigates in 2D grid with Arrow Left/Right and Arrow Up/Down", () => {
    const onOpenItem = vi.fn();
    render(<ListNavigationTestComponent itemCount={6} columns={3} onOpenItem={onOpenItem} />);

    // Starts at index 0
    expect(screen.getByText(/Item 0 \(Selected\)/i)).toBeInTheDocument();

    // ArrowRight moves to index 1
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByText(/Item 1 \(Selected\)/i)).toBeInTheDocument();

    // ArrowLeft moves back to index 0
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByText(/Item 0 \(Selected\)/i)).toBeInTheDocument();

    // ArrowDown in a 3-column grid jumps by +3 (index 0 -> index 3)
    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(screen.getByText(/Item 3 \(Selected\)/i)).toBeInTheDocument();

    // ArrowUp jumps back by -3 (index 3 -> index 0)
    fireEvent.keyDown(window, { key: "ArrowUp" });
    expect(screen.getByText(/Item 0 \(Selected\)/i)).toBeInTheDocument();
  });

  it("triggers onWhatsAppItem when 'w', 'W', or 'Alt+W' is pressed on highlighted item", () => {
    const onWhatsAppItem = vi.fn();
    render(<ListNavigationTestComponent itemCount={4} columns={1} onWhatsAppItem={onWhatsAppItem} />);

    // Move to item 1
    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(screen.getByText(/Item 1 \(Selected\)/i)).toBeInTheDocument();

    // Press 'w'
    fireEvent.keyDown(window, { key: "w" });
    expect(onWhatsAppItem).toHaveBeenCalledWith(1);

    // Press 'W'
    fireEvent.keyDown(window, { key: "W" });
    expect(onWhatsAppItem).toHaveBeenCalledWith(1);

    // Press Alt+W
    fireEvent.keyDown(window, { key: "w", altKey: true });
    expect(onWhatsAppItem).toHaveBeenCalledWith(1);
  });

  it("advances focus with Enter and calls onSave when Enter is pressed on the last field", () => {
    const onSave = vi.fn();
    render(<FormNavigationTestComponent onSave={onSave} />);

    const input1 = screen.getByTestId("input-1");
    const input2 = screen.getByTestId("input-2");

    input1.focus();
    expect(document.activeElement).toBe(input1);

    // Press Enter in input1 -> advances to input2
    fireEvent.keyDown(input1, { key: "Enter" });
    expect(document.activeElement).toBe(input2);

    // Press Enter in input2 (the last field in form) -> triggers onSave!
    fireEvent.keyDown(input2, { key: "Enter" });
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("calls onSave when Alt+A is pressed inside form", () => {
    const onSave = vi.fn();
    render(<FormNavigationTestComponent onSave={onSave} />);

    const input1 = screen.getByTestId("input-1");
    input1.focus();

    fireEvent.keyDown(input1, { key: "a", altKey: true });
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
