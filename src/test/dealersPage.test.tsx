import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import Dealers from "@/pages/Dealers";
import * as firestore from "@/lib/firestore";

// Mock firestore functions
vi.mock("@/lib/firestore", async () => {
  const actual = await vi.importActual<typeof firestore>("@/lib/firestore");
  return {
    ...actual,
    createInquiry: vi.fn().mockResolvedValue("mock-inquiry-id"),
  };
});

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <HelmetProvider>
      <BrowserRouter>{ui}</BrowserRouter>
    </HelmetProvider>
  );
}

describe("Dealers Page (Direct Inquiry & Validation)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders dealer portal headline, brand strip, and application form", () => {
    renderWithProviders(<Dealers />);

    expect(screen.getByText("Dealer & Bulk Buyer Portal")).toBeInTheDocument();
    expect(screen.getByText("Apply for Dealer Pricing")).toBeInTheDocument();
    expect(screen.getByLabelText(/Your Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Shop \/ Business Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Mobile \/ WhatsApp Number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/City \/ District/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Submit Dealer Inquiry/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Inquire on WhatsApp/i })).toBeInTheDocument();
  });

  it("shows error for invalid phone number and does not submit to Firestore", async () => {
    renderWithProviders(<Dealers />);

    fireEvent.change(screen.getByLabelText(/Your Full Name/i), {
      target: { value: "Test Dealer" },
    });
    fireEvent.change(screen.getByLabelText(/Shop \/ Business Name/i), {
      target: { value: "Test IT Store" },
    });
    fireEvent.change(screen.getByLabelText(/Mobile \/ WhatsApp Number/i), {
      target: { value: "12345" }, // Invalid
    });
    fireEvent.change(screen.getByLabelText(/City \/ District/i), {
      target: { value: "Neemuch" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Submit Dealer Inquiry/i }));

    expect(firestore.createInquiry).not.toHaveBeenCalled();
    expect(
      screen.getByText(/Please enter a valid 10-digit mobile number/i)
    ).toBeInTheDocument();
  });

  it("submits valid dealer inquiry directly to Firestore and shows confirmation screen", async () => {
    renderWithProviders(<Dealers />);

    fireEvent.change(screen.getByLabelText(/Your Full Name/i), {
      target: { value: "Rajesh Sharma" },
    });
    fireEvent.change(screen.getByLabelText(/Shop \/ Business Name/i), {
      target: { value: "Sharma IT Solutions" },
    });
    fireEvent.change(screen.getByLabelText(/Mobile \/ WhatsApp Number/i), {
      target: { value: "9826012345" },
    });
    fireEvent.change(screen.getByLabelText(/City \/ District/i), {
      target: { value: "Mandsaur" },
    });
    fireEvent.change(
      screen.getByLabelText(/Product Requirements & Quantities/i),
      {
        target: { value: "Looking for 20 Laptops and 50 RAM sticks." },
      }
    );

    fireEvent.click(screen.getByRole("button", { name: /Submit Dealer Inquiry/i }));

    await waitFor(() => {
      expect(firestore.createInquiry).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Rajesh Sharma",
          phone: "919826012345",
          subject: "Dealer Wholesale Pricing – Sharma IT Solutions",
          status: "pending",
          source: "dealers_portal",
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Dealer Inquiry Received!")).toBeInTheDocument();
      expect(screen.getByText(/Submit Another Inquiry/i)).toBeInTheDocument();
    });
  });
});
