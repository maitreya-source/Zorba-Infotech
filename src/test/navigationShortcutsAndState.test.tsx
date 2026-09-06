import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useTallyListNavigation } from "@/hooks/useTallyKeyboard";

function StatefulListTestComponent({
  initialIndex = 2,
  itemCount = 5,
}: {
  initialIndex?: number;
  itemCount?: number;
}) {
  const items = Array.from({ length: itemCount }, (_, i) => ({
    id: `cust-${i}`,
    name: `Customer ${i}`,
  }));

  const { selectedIndex, setSelectedIndex } = useTallyListNavigation({
    items,
    initialIndex,
    enabled: true,
  });

  return (
    <div>
      <div data-testid="selected-index">{selectedIndex}</div>
      {items.map((item, idx) => (
        <div
          key={item.id}
          data-testid={`row-${idx}`}
          data-selected={selectedIndex === idx}
          onClick={() => setSelectedIndex(idx)}
        >
          {item.name}
        </div>
      ))}
    </div>
  );
}

describe("Stateful List Highlight Navigation & Initial Index", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes selectedIndex to initialIndex provided by navigation state", () => {
    render(<StatefulListTestComponent initialIndex={3} />);
    expect(screen.getByTestId("selected-index").textContent).toBe("3");
    expect(screen.getByTestId("row-3")).toHaveAttribute("data-selected", "true");
    expect(screen.getByTestId("row-0")).toHaveAttribute("data-selected", "false");
  });

  it("updates selectedIndex when initialIndex prop changes dynamically", () => {
    const { rerender } = render(<StatefulListTestComponent initialIndex={1} />);
    expect(screen.getByTestId("selected-index").textContent).toBe("1");

    rerender(<StatefulListTestComponent initialIndex={4} />);
    expect(screen.getByTestId("selected-index").textContent).toBe("4");
    expect(screen.getByTestId("row-4")).toHaveAttribute("data-selected", "true");
  });

  it("allows continuous arrow navigation from initialIndex", () => {
    render(<StatefulListTestComponent initialIndex={2} />);
    expect(screen.getByTestId("selected-index").textContent).toBe("2");

    // Arrow Down moves from 2 to 3
    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(screen.getByTestId("selected-index").textContent).toBe("3");

    // Arrow Up moves back to 2
    fireEvent.keyDown(window, { key: "ArrowUp" });
    expect(screen.getByTestId("selected-index").textContent).toBe("2");
  });
});

describe("Contextual Escape Navigation Flow", () => {
  // Test component simulating a Detail page (Customer or Team Member)
  function DummyDetailPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const originFrom = (location.state as any)?.from;

    const handleBack = () => {
      const target = originFrom || "/admin/directory";
      navigate(target, {
        state: { selectedId: "entity-42", selectedIndex: 3 },
      });
    };

    const handleOpenForm = () => {
      navigate("/admin/form", {
        state: { from: location.pathname },
      });
    };

    return (
      <div>
        <div data-testid="detail-view">Detail Page</div>
        <button data-testid="back-btn" onClick={handleBack}>
          Back
        </button>
        <button data-testid="open-form-btn" onClick={handleOpenForm}>
          Open Form
        </button>
      </div>
    );
  }

  // Test component simulating a Form page (Service Call or Quotation)
  function DummyFormPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const exitTarget = (location.state as any)?.from || "/admin/service-calls";

    const handleEsc = () => {
      navigate(exitTarget);
    };

    return (
      <div>
        <div data-testid="form-view">Form Page</div>
        <div data-testid="exit-target">{exitTarget}</div>
        <button data-testid="esc-btn" onClick={handleEsc}>
          Esc
        </button>
      </div>
    );
  }

  it("returns to specific referring view (location.state.from) instead of generic root", () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: "/admin/customers/cust-123" }]}>
        <Routes>
          <Route path="/admin/customers/cust-123" element={<DummyDetailPage />} />
          <Route path="/admin/form" element={<DummyFormPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Click open form from customer detail
    fireEvent.click(screen.getByTestId("open-form-btn"));

    // Form page should have exitTarget pointing back to /admin/customers/cust-123
    expect(screen.getByTestId("form-view")).toBeInTheDocument();
    expect(screen.getByTestId("exit-target").textContent).toBe("/admin/customers/cust-123");
  });

  it("falls back to generic root when no location.state.from is provided", () => {
    render(
      <MemoryRouter initialEntries={["/admin/form"]}>
        <Routes>
          <Route path="/admin/form" element={<DummyFormPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId("form-view")).toBeInTheDocument();
    expect(screen.getByTestId("exit-target").textContent).toBe("/admin/service-calls");
  });
});
