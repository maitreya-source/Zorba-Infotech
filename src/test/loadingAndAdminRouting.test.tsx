import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import LoadingScreen from "@/components/common/LoadingScreen";

describe("Unified LoadingScreen Component (Task 1)", () => {
  it("renders correctly with custom title and subtitle", () => {
    render(<LoadingScreen fullScreen={true} title="Zorba Infotech" subtitle="Loading catalog..." />);
    
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Zorba Infotech")).toBeInTheDocument();
    expect(screen.getByText("Loading catalog...")).toBeInTheDocument();
  });

  it("renders inline non-fullscreen mode properly", () => {
    const { container } = render(
      <LoadingScreen fullScreen={false} title="Admin Workspace" subtitle="Loading records..." />
    );

    expect(screen.getByText("Admin Workspace")).toBeInTheDocument();
    expect(screen.getByText("Loading records...")).toBeInTheDocument();
    // Non-fullscreen should NOT have fixed inset-0
    expect(container.querySelector(".fixed.inset-0")).toBeNull();
  });

  it("has accessible aria-label attributes", () => {
    render(<LoadingScreen title="Workspace" subtitle="Verifying permissions..." />);
    const statusEl = screen.getByRole("status");
    expect(statusEl).toHaveAttribute("aria-label", "Workspace - Verifying permissions...");
  });
});
