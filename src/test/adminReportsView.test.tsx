import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminReports from "../pages/admin/AdminReports";

// Mock Firestore queries
vi.mock("@/lib/firestore", () => ({
  getServiceCallsForMonth: vi.fn().mockResolvedValue([
    {
      id: "sc-test-1",
      ticketNo: "SC-9001",
      type: "in_house_repair",
      dateTime: "2026-09-05T12:00:00",
      customerId: "c-1",
      customerName: "Sharma Trading Co.",
      customerPhone: "9826011223",
      deviceCategory: "Laser Printer",
      modelNumber: "HP LaserJet 1020",
      issueDescription: "Toner cartridge sensor broken",
      warrantyStatus: "out_of_warranty",
      status: "completed",
      technicianId: "t-1",
      technicianName: "Ramesh Sharma",
      parts: [],
      partsTotal: 0,
      serviceCharges: 650,
      grandTotal: 650,
      paymentStatus: "paid",
      paymentMode: "upi",
      amountPaid: 650,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ]),
  getServiceCalls: vi.fn().mockResolvedValue([]),
  getFinancialYear: vi.fn().mockReturnValue({ fyId: "FY2627", startYear: 2026, endYear: 2027 }),
  getTechnicians: vi.fn().mockResolvedValue([
    { id: "t-1", name: "Ramesh Sharma", active: true },
    { id: "t-2", name: "Vikram Singh", active: true },
  ]),
}));

// Mock useStaffProfile
vi.mock("@/contexts/StaffProfileContext", () => ({
  useStaffProfile: () => ({
    activeProfile: { id: "staff-1", name: "Admin Lead" },
  }),
}));

describe("AdminReports Component Integration", () => {
  it("renders executive title and quick period preset buttons", async () => {
    render(
      <MemoryRouter>
        <AdminReports />
      </MemoryRouter>
    );

    // Title
    expect(screen.getByText(/Daily & Monthly Service Call Reports/i)).toBeInTheDocument();

    // Preset buttons
    expect(screen.getByRole("button", { name: "Today" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Yesterday" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Last 7 Days" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "This Month" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Last Month" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Custom Range" })).toBeInTheDocument();
  });

  it("renders tabular structure with ticket rows and allows switching to Group by Day", async () => {
    render(
      <MemoryRouter>
        <AdminReports />
      </MemoryRouter>
    );

    // Verify ticket row is rendered in the unified table
    expect(await screen.findByText("SC-9001")).toBeInTheDocument();
    expect(screen.getByText("Sharma Trading Co.")).toBeInTheDocument();
    expect(screen.getByText("HP LaserJet 1020")).toBeInTheDocument();

    // Verify layout toggle buttons
    const groupBtn = screen.getByRole("button", { name: "Group by Day" });
    expect(groupBtn).toBeInTheDocument();
    fireEvent.click(groupBtn);

    // In group by day mode, ticket is still visible
    expect(screen.getByText("SC-9001")).toBeInTheDocument();

    // Toggle back to unified table
    const tableBtn = screen.getByRole("button", { name: "Unified Table" });
    fireEvent.click(tableBtn);
    expect(screen.getByText("SC-9001")).toBeInTheDocument();
  });
});
