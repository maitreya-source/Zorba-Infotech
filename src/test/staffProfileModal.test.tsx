import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import StaffProfileSelectorModal from "@/components/admin/StaffProfileSelectorModal";
import { StaffProfileProvider } from "@/contexts/StaffProfileContext";
import * as firestore from "@/lib/firestore";
import type { TeamMember } from "@/lib/types";

vi.mock("@/lib/firestore", async () => {
  const actual = await vi.importActual<typeof import("@/lib/firestore")>("@/lib/firestore");
  return {
    ...actual,
    getTeamMembers: vi.fn().mockResolvedValue([
      {
        id: "staff-1",
        name: "Manish Mulchandani",
        role: "proprietor",
        avatar: "lion",
        pin: "12345",
        active: true,
      },
      {
        id: "staff-2",
        name: "Ramesh Sharma",
        role: "backoffice",
        avatar: "penguin",
        pin: "54321",
        active: true,
      },
    ] as TeamMember[]),
    updateTeamMember: vi.fn().mockResolvedValue(true),
  };
});

describe("Mandatory Staff Profile Selection & Non-Dismissible Enforcement", () => {
  it("does NOT display a close (X) button when there is no active profile or canDismiss is false", async () => {
    render(
      <StaffProfileProvider>
        <StaffProfileSelectorModal open={true} canDismiss={false} />
      </StaffProfileProvider>
    );

    // Header should show prompt
    expect(await screen.findByText("Who is working today?")).toBeInTheDocument();

    // Verify close buttons with title="Close" are not present
    const closeBtn = screen.queryByTitle("Close");
    expect(closeBtn).toBeNull();
  });

  it("allows selecting a staff profile and verifying with 5-digit PIN", async () => {
    const onOpenChange = vi.fn();

    render(
      <StaffProfileProvider>
        <StaffProfileSelectorModal open={true} onOpenChange={onOpenChange} canDismiss={false} />
      </StaffProfileProvider>
    );

    const manishCard = await screen.findByText("Manish Mulchandani");
    fireEvent.click(manishCard);

    // Prompts for PIN
    expect(await screen.findByText("Enter Security PIN")).toBeInTheDocument();

    // Enter correct PIN
    const pinInput = screen.getByPlaceholderText("•••••");
    fireEvent.change(pinInput, { target: { value: "12345" } });

    // Submit PIN
    const unlockBtn = screen.getByRole("button", { name: /Unlock Profile/i });
    fireEvent.click(unlockBtn);

    // Modal closes upon successful PIN validation
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
