import { useState, useEffect } from "react";
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
    onOpenItem: vi.fn(),
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

describe("Customer Creation & List Shortcut Safety", () => {
  function CustomerListTestComponent({ onNewItem }: { onNewItem: () => void }) {
    const searchRef = { current: null as HTMLInputElement | null };
    const items = [
      { id: "cust-1", name: "Naresh Patel" },
      { id: "cust-2", name: "Anand Sharma" },
    ];
    const { selectedIndex } = useTallyListNavigation({
      items,
      searchInputRef: searchRef,
      onOpenItem: vi.fn(),
      onNewItem,
    });

    return (
      <div>
        <input data-testid="search-input" ref={(el) => (searchRef.current = el)} />
        <div data-testid="selected-customer">{items[selectedIndex]?.name}</div>
      </div>
    );
  }

  it("does NOT trigger onNewItem when pressing plain 'n' or 'a'", () => {
    const onNewItem = vi.fn();
    render(<CustomerListTestComponent onNewItem={onNewItem} />);

    // Press plain 'n' (simulate user typing or pressing 'n')
    fireEvent.keyDown(window, { key: "n", code: "KeyN" });
    expect(onNewItem).not.toHaveBeenCalled();

    // Press plain 'a'
    fireEvent.keyDown(window, { key: "a", code: "KeyA" });
    expect(onNewItem).not.toHaveBeenCalled();
  });

  it("triggers onNewItem when pressing Alt+C or Alt+N or Insert", () => {
    const onNewItem = vi.fn();
    render(<CustomerListTestComponent onNewItem={onNewItem} />);

    // Press Alt+C
    fireEvent.keyDown(window, { key: "c", code: "KeyC", altKey: true });
    expect(onNewItem).toHaveBeenCalledTimes(1);

    // Press Alt+N
    fireEvent.keyDown(window, { key: "n", code: "KeyN", altKey: true });
    expect(onNewItem).toHaveBeenCalledTimes(2);

    // Press Insert
    fireEvent.keyDown(window, { key: "Insert" });
    expect(onNewItem).toHaveBeenCalledTimes(3);
  });
});

describe("Team Member Detail Tab Shortcuts & Edit Profile", () => {
  function TeamMemberDetailShortcutsComponent({
    onEditProfile,
  }: {
    onEditProfile: () => void;
  }) {
    const [tab, setTab] = useState<"completed" | "payment_due" | "pending" | "all" | "payouts">("completed");
    const tabsList: ("completed" | "payment_due" | "pending" | "all" | "payouts")[] = [
      "completed",
      "payment_due",
      "pending",
      "all",
      "payouts",
    ];

    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        // Alt+A -> Edit Profile
        if (e.altKey && (e.key.toLowerCase() === "a" || e.code === "KeyA")) {
          e.preventDefault();
          onEditProfile();
          return;
        }

        // ArrowLeft -> Previous Tab
        if (e.key === "ArrowLeft" && !e.ctrlKey && !e.altKey && !e.metaKey) {
          e.preventDefault();
          setTab((curr) => {
            const idx = tabsList.indexOf(curr);
            const prevIdx = (idx - 1 + tabsList.length) % tabsList.length;
            return tabsList[prevIdx];
          });
          return;
        }

        // ArrowRight -> Next Tab
        if (e.key === "ArrowRight" && !e.ctrlKey && !e.altKey && !e.metaKey) {
          e.preventDefault();
          setTab((curr) => {
            const idx = tabsList.indexOf(curr);
            const nextIdx = (idx + 1) % tabsList.length;
            return tabsList[nextIdx];
          });
          return;
        }

        // 1-5 Keys -> Jump to Tab
        if (!e.ctrlKey && !e.altKey && !e.metaKey && ["1", "2", "3", "4", "5"].includes(e.key)) {
          const targetIdx = parseInt(e.key, 10) - 1;
          if (targetIdx >= 0 && targetIdx < tabsList.length) {
            e.preventDefault();
            setTab(tabsList[targetIdx]);
            return;
          }
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onEditProfile]);

    return (
      <div>
        <div data-testid="active-tab">{tab}</div>
      </div>
    );
  }

  it("cycles tabs with ArrowRight and ArrowLeft", () => {
    render(<TeamMemberDetailShortcutsComponent onEditProfile={vi.fn()} />);
    expect(screen.getByTestId("active-tab").textContent).toBe("completed");

    // ArrowRight -> payment_due
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByTestId("active-tab").textContent).toBe("payment_due");

    // ArrowRight -> pending
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByTestId("active-tab").textContent).toBe("pending");

    // ArrowLeft -> back to payment_due
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByTestId("active-tab").textContent).toBe("payment_due");
  });

  it("jumps to specific tabs using 1-5 numeric keys", () => {
    render(<TeamMemberDetailShortcutsComponent onEditProfile={vi.fn()} />);

    // Press '4' -> all
    fireEvent.keyDown(window, { key: "4" });
    expect(screen.getByTestId("active-tab").textContent).toBe("all");

    // Press '5' -> payouts
    fireEvent.keyDown(window, { key: "5" });
    expect(screen.getByTestId("active-tab").textContent).toBe("payouts");

    // Press '1' -> completed
    fireEvent.keyDown(window, { key: "1" });
    expect(screen.getByTestId("active-tab").textContent).toBe("completed");
  });

  it("triggers onEditProfile when Alt+A is pressed", () => {
    const onEditProfile = vi.fn();
    render(<TeamMemberDetailShortcutsComponent onEditProfile={onEditProfile} />);

    fireEvent.keyDown(window, { key: "a", code: "KeyA", altKey: true });
    expect(onEditProfile).toHaveBeenCalledTimes(1);
  });
});


