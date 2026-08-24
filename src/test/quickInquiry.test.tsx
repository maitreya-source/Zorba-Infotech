import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { isValidIndianPhoneNumber, formatIndianPhoneNumber, formatPhoneForDisplay } from "@/lib/utils";
import QuickInquiryDialog from "@/components/common/QuickInquiryDialog";
import * as firestoreModule from "@/lib/firestore";

describe("Phone Validation & Formatting Standards (Task 2)", () => {
  it("validates standard 10-digit Indian numbers starting with 6, 7, 8, 9", () => {
    expect(isValidIndianPhoneNumber("9826199730")).toBe(true);
    expect(isValidIndianPhoneNumber("8889912345")).toBe(true);
    expect(isValidIndianPhoneNumber("7000123456")).toBe(true);
    expect(isValidIndianPhoneNumber("6260123456")).toBe(true);
  });

  it("validates Indian numbers with leading 0 or +91", () => {
    expect(isValidIndianPhoneNumber("09826199730")).toBe(true);
    expect(isValidIndianPhoneNumber("+91 98261 99730")).toBe(true);
    expect(isValidIndianPhoneNumber("919826199730")).toBe(true);
    expect(isValidIndianPhoneNumber("+91-98261-99730")).toBe(true);
  });

  it("rejects invalid phone numbers", () => {
    expect(isValidIndianPhoneNumber("1234567890")).toBe(false); // starts with 1
    expect(isValidIndianPhoneNumber("5555555555")).toBe(false); // starts with 5
    expect(isValidIndianPhoneNumber("98261")).toBe(false); // too short
    expect(isValidIndianPhoneNumber("98261997301234")).toBe(false); // too long
    expect(isValidIndianPhoneNumber("")).toBe(false);
  });

  it("formats numbers to clean E.164 without plus for WhatsApp API compatibility", () => {
    expect(formatIndianPhoneNumber("9826199730")).toBe("919826199730");
    expect(formatIndianPhoneNumber("+91 98261 99730")).toBe("919826199730");
    expect(formatIndianPhoneNumber("09826199730")).toBe("919826199730");
  });

  it("formats numbers cleanly for human display (+91 XXXXXXXXXX)", () => {
    expect(formatPhoneForDisplay("9826199730")).toBe("+91 9826199730");
    expect(formatPhoneForDisplay("919826199730")).toBe("+91 9826199730");
  });
});

describe("QuickInquiryDialog Component (Task 2)", () => {
  it("renders when open is true", () => {
    render(
      <QuickInquiryDialog
        open={true}
        onOpenChange={() => {}}
        defaultProduct="HP Pavilion 15"
      />
    );

    expect(screen.getByText(/Inquire About HP Pavilion 15/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Your Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/10-Digit Mobile/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Requirement \/ Message/i)).toBeInTheDocument();
  });

  it("submits inquiry with valid inputs and displays confirmation", async () => {
    const createInquirySpy = vi.spyOn(firestoreModule, "createInquiry").mockResolvedValue({
      id: "test-inq-123",
      name: "Ramesh Sharma",
      phone: "919826199730",
      message: "Need RAM 16GB",
      status: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as any);

    render(
      <QuickInquiryDialog
        open={true}
        onOpenChange={() => {}}
      />
    );

    fireEvent.change(screen.getByLabelText(/Your Full Name/i), {
      target: { value: "Ramesh Sharma" },
    });
    fireEvent.change(screen.getByLabelText(/10-Digit Mobile/i), {
      target: { value: "9826199730" },
    });
    fireEvent.change(screen.getByLabelText(/Requirement \/ Message/i), {
      target: { value: "Need RAM 16GB DDR5" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Submit Inquiry/i }));

    await waitFor(() => {
      expect(createInquirySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Ramesh Sharma",
          phone: "919826199730",
          message: "Need RAM 16GB DDR5",
        })
      );
    });

    expect(await screen.findByText(/Inquiry Received!/i)).toBeInTheDocument();
    createInquirySpy.mockRestore();
  });
});
