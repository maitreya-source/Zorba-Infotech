import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DispatchSlipPrintModal from "@/components/admin/DispatchSlipPrintModal";
import { formatPhoneForPrint } from "@/lib/utils";
import type { ServiceCall, ServiceCenter } from "@/lib/types";

describe("Service Center Parcel Dispatch & Shipping Label Print Modal", () => {
  const mockServiceCenter: ServiceCenter = {
    id: "sc-hp-indore",
    name: "HP Authorized Regional Service Center",
    phone: "+91 98260 12345",
    whatsappPhone: "+91 98260 12345",
    email: "indore.service@hp-support.com",
    addresses: [
      {
        id: "sc-addr-1",
        address: "Shop 104, Silver Mall, RNT Marg, Indore, MP - 452001",
        city: "Indore",
        isDefault: true,
      },
    ],
    pocs: [
      {
        id: "poc-1",
        name: "Rajesh Verma",
        designation: "Service Head",
        phone: "+91 98260 99887",
        isWhatsApp: true,
      },
    ],
    createdAt: Date.now(),
  };

  const mockServiceCall: ServiceCall = {
    id: "sc-call-101",
    ticketNo: "SC26-0842",
    type: "company_service_center",
    dateTime: "2026-09-05",
    customerId: "cust-1",
    customerName: "Sharma Electronics",
    customerPhone: "9826011223",
    customerAddress: "Station Road, Neemuch",
    deviceCategory: "Laser Printer",
    modelNumber: "HP LaserJet Pro MFP M126nw",
    serialNumber: "VNB3K98765",
    quantity: 1,
    issueDescription: "Paper pickup roller failure and scanner error 22",
    warrantyStatus: "in_warranty",
    status: "sent_to_service_center",
    serviceCenterId: "sc-hp-indore",
    serviceCenterName: "HP Authorized Regional Service Center",
    serviceCenterAddress: "Shop 104, Silver Mall, RNT Marg, Indore, MP - 452001",
    courierName: "Trackon Courier",
    rmaNumber: "TRK-99884210",
    courierCharges: 150,
    parts: [],
    partsTotal: 0,
    serviceCharges: 0,
    grandTotal: 150,
    dateOfPurchase: "2025-11-10",
    billNumber: "INV-2025-4421",
    handledByStaffName: "Manish Mulchandani",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  beforeEach(() => {
    vi.spyOn(window, "print").mockImplementation(() => {});
  });

  it("renders Zorba Infotech dispatch origin address (FROM) and Service Center destination (TO)", () => {
    render(
      <DispatchSlipPrintModal
        serviceCall={mockServiceCall}
        open={true}
        onOpenChange={vi.fn()}
        serviceCenter={mockServiceCenter}
      />
    );

    // 1. Verify Zorba Infotech Sender / Origin details
    const zorbaHeadings = screen.getAllByText(/ZORBA INFOTECH/i);
    expect(zorbaHeadings.length).toBeGreaterThan(0);

    expect(screen.getAllByText(/Shop No\. 5 & 6, U-Shape Market, Tagore Marg/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Neemuch 458 441/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\+91 99935 99730/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/zorbainfotech@gmail\.com/i).length).toBeGreaterThan(0);

    // 2. Verify Service Center Destination details
    const destCenters = screen.getAllByText("HP Authorized Regional Service Center");
    expect(destCenters.length).toBeGreaterThan(0);

    const destAddrs = screen.getAllByText(/Shop 104, Silver Mall, RNT Marg, Indore, MP - 452001/i);
    expect(destAddrs.length).toBeGreaterThan(0);

    // Verify POC details and formatted phone (+91 XXXXX XXXXX)
    expect(screen.getAllByText(/Rajesh Verma/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\+91 98260 99887/i).length).toBeGreaterThan(0);
  });

  it("renders parcel hardware information, ticket number, barcode, and courier logistics", () => {
    render(
      <DispatchSlipPrintModal
        serviceCall={mockServiceCall}
        open={true}
        onOpenChange={vi.fn()}
        serviceCenter={mockServiceCenter}
      />
    );

    // Ticket Number
    expect(screen.getAllByText(/SC26-0842/i).length).toBeGreaterThan(0);

    // Device Category, Model, and Serial Number
    expect(screen.getAllByText(/Laser Printer/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/HP LaserJet Pro MFP M126nw/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/VNB3K98765/i).length).toBeGreaterThan(0);

    // Courier Logistics
    expect(screen.getAllByText(/Trackon Courier/i).length).toBeGreaterThan(0);
    // Docket / RMA number is excluded from print per requirement (pending until courier pickup)
    expect(screen.queryByText(/TRK-99884210/i)).toBeNull();

    // Issue Description (RMA Fault)
    expect(screen.getAllByText(/Paper pickup roller failure and scanner error 22/i).length).toBeGreaterThan(0);

    // Fragile warning banner
    expect(screen.getByText(/FRAGILE — HANDLE WITH CARE — SENSITIVE ELECTRONIC HARDWARE/i)).toBeInTheDocument();
  });

  it("supports switching between Dual Layout, Full Challan, and Outer Box Label formats", () => {
    render(
      <DispatchSlipPrintModal
        serviceCall={mockServiceCall}
        open={true}
        onOpenChange={vi.fn()}
        serviceCenter={mockServiceCenter}
      />
    );

    // Default mode is dual (shows cut line)
    expect(screen.getByText(/CUT ALONG DOTTED LINE — AFFIX BOTTOM SECTION TO PARCEL BOX/i)).toBeInTheDocument();

    // Switch to "Full A4 Challan"
    const challanBtn = screen.getByRole("button", { name: "Full A4 Challan" });
    fireEvent.click(challanBtn);

    // Cut line should disappear in single challan mode
    expect(screen.queryByText(/CUT ALONG DOTTED LINE — AFFIX BOTTOM SECTION TO PARCEL BOX/i)).toBeNull();
    // Challan header remains visible
    expect(screen.getByText(/ZORBA INFOTECH — SERVICE DISPATCH CHALLAN/i)).toBeInTheDocument();

    // Switch to "Outer Box Label Only"
    const labelBtn = screen.getByRole("button", { name: "Outer Box Label Only" });
    fireEvent.click(labelBtn);

    expect(screen.queryByText(/CUT ALONG DOTTED LINE — AFFIX BOTTOM SECTION TO PARCEL BOX/i)).toBeNull();
    expect(screen.getByText(/PARCEL DISPATCH \/ SHIPPING LABEL/i)).toBeInTheDocument();
  });

  it("allows toggling section visibility (e.g. customer reference)", () => {
    render(
      <DispatchSlipPrintModal
        serviceCall={mockServiceCall}
        open={true}
        onOpenChange={vi.fn()}
        serviceCenter={mockServiceCenter}
      />
    );

    expect(screen.getByText(/Sharma Electronics/i)).toBeInTheDocument();

    // Uncheck Customer Reference checkbox
    const customerCheckbox = screen.getByLabelText(/Customer Reference/i);
    fireEvent.click(customerCheckbox);

    // Customer Reference text should now be hidden
    expect(screen.queryByText(/Sharma Electronics/i)).toBeNull();
  });

  it("allows customizing package weight and triggers window.print when clicking Print", () => {
    render(
      <DispatchSlipPrintModal
        serviceCall={mockServiceCall}
        open={true}
        onOpenChange={vi.fn()}
        serviceCenter={mockServiceCenter}
      />
    );

    // Change package weight
    const weightInput = screen.getByPlaceholderText(/e\.g\. 1\.2 kg/i);
    fireEvent.change(weightInput, { target: { value: "3.8 kg" } });
    expect(screen.getAllByText(/\(3\.8 kg\)/i).length).toBeGreaterThan(0);

    // Click Print button
    const printBtn = screen.getByRole("button", { name: /Print A4 Dispatch Sheet/i });
    fireEvent.click(printBtn);

    expect(window.print).toHaveBeenCalled();
  });

  it("calls onSwitchToJobCard when user requests switching to Job Card", () => {
    const onSwitch = vi.fn();
    render(
      <DispatchSlipPrintModal
        serviceCall={mockServiceCall}
        open={true}
        onOpenChange={vi.fn()}
        serviceCenter={mockServiceCenter}
        onSwitchToJobCard={onSwitch}
      />
    );

    const switchBtn = screen.getByRole("button", { name: /Switch to Job Card/i });
    fireEvent.click(switchBtn);

    expect(onSwitch).toHaveBeenCalledTimes(1);
  });

  it("ensures TO destination box is visually dominant and larger than FROM origin box", () => {
    const { container } = render(
      <DispatchSlipPrintModal
        serviceCall={mockServiceCall}
        open={true}
        onOpenChange={vi.fn()}
        serviceCenter={mockServiceCenter}
      />
    );

    // Verify TO header badge and text exists
    expect(screen.getByText(/★ PARCEL DESTINATION ★/i)).toBeInTheDocument();
    expect(screen.getByText(/SHIP TO \/ DELIVER TO \(DESTINATION\):/i)).toBeInTheDocument();

    // Verify FROM has explicit RETURN ADDRESS marker
    expect(screen.getAllByText(/RETURN ADDRESS/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/FROM \/ SENDER:/i)).toBeInTheDocument();

    // Verify flex distribution: TO is flex-[68] (dominant ~68%), FROM is flex-[32] (~32%)
    const toBox = document.body.querySelector(".flex-\\[68\\]");
    const fromBox = document.body.querySelector(".flex-\\[32\\]");
    expect(toBox).not.toBeNull();
    expect(fromBox).not.toBeNull();
  });

  it("removes signature line and courier sign from the dispatch slip printout", () => {
    render(
      <DispatchSlipPrintModal
        serviceCall={mockServiceCall}
        open={true}
        onOpenChange={vi.fn()}
        serviceCenter={mockServiceCenter}
      />
    );

    // Courier Receiver Sign should not be rendered
    expect(screen.queryByText(/Courier Receiver Sign/i)).toBeNull();
    // Authorized Signatory line should not be rendered
    expect(screen.queryByText(/Authorized Signatory/i)).toBeNull();
    // Non-commercial declaration remains intact
    expect(screen.getByText(/NON-COMMERCIAL DISPATCH DECLARATION:/i)).toBeInTheDocument();
    expect(screen.getByText(/For ZORBA INFOTECH, NEEMUCH/i)).toBeInTheDocument();
  });
});

describe("formatPhoneForPrint utility", () => {
  it("formats 10-digit mobile numbers as +91 XXXXX XXXXX", () => {
    expect(formatPhoneForPrint("9993599730")).toBe("+91 99935 99730");
    expect(formatPhoneForPrint("7049070640")).toBe("+91 70490 70640");
  });

  it("strips 91 prefix and formats as +91 XXXXX XXXXX", () => {
    expect(formatPhoneForPrint("919993599730")).toBe("+91 99935 99730");
    expect(formatPhoneForPrint("+919993599730")).toBe("+91 99935 99730");
    expect(formatPhoneForPrint("+91 9993599730")).toBe("+91 99935 99730");
  });

  it("strips 0 prefix and formats as +91 XXXXX XXXXX", () => {
    expect(formatPhoneForPrint("09993599730")).toBe("+91 99935 99730");
  });

  it("handles multiple comma or slash separated numbers", () => {
    expect(formatPhoneForPrint("9993599730, 9302199730")).toBe("+91 99935 99730 / +91 93021 99730");
    expect(formatPhoneForPrint("9993599730 / 9302199730")).toBe("+91 99935 99730 / +91 93021 99730");
  });

  it("returns raw text if null, empty, or special text", () => {
    expect(formatPhoneForPrint("")).toBe("");
    expect(formatPhoneForPrint(null)).toBe("");
    expect(formatPhoneForPrint(undefined)).toBe("");
  });
});
