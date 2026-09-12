import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import JobCardPrintModal from "@/components/admin/JobCardPrintModal";
import ServiceCallDeviceDetailsCard from "@/components/admin/service-call/ServiceCallDeviceDetailsCard";
import type { ServiceCall, ServiceCallProduct } from "@/lib/types";

describe("JobCardPrintModal Multi-Product & Spare Parts Support", () => {
  const mockCall: ServiceCall = {
    id: "sc-call-multi",
    ticketNo: "SC26-9001",
    type: "company_service_center",
    dateTime: "2026-09-10",
    customerId: "cust-1",
    customerName: "Rajesh Hardware",
    customerPhone: "9826011223",
    customerAddress: "Main Road, Neemuch",
    products: [
      {
        id: "prod-1",
        deviceCategory: "Laptop",
        modelNumber: "Lenovo ThinkPad E14",
        serialNumber: "PF309ABC",
        quantity: 1,
        warrantyStatus: "in_warranty",
        issueDescription: "Display flickering",
      },
      {
        id: "prod-2",
        deviceCategory: "Laser Printer",
        modelNumber: "HP LaserJet 1020",
        serialNumber: "CNB88441",
        quantity: 2,
        warrantyStatus: "out_of_warranty",
        issueDescription: "Toner paper jam",
      },
    ],
    deviceCategory: "Laptop",
    modelNumber: "Lenovo ThinkPad E14",
    serialNumber: "PF309ABC",
    quantity: 3,
    issueDescription: "Display flickering",
    warrantyStatus: "in_warranty",
    status: "in_progress",
    parts: [
      {
        id: "part-1",
        name: "RAM 8GB DDR4 Crucial",
        quantity: 1,
        unitPrice: 1800,
        totalPrice: 1800,
      },
      {
        id: "part-2",
        name: "Printer Paper Pickup Roller",
        quantity: 2,
        unitPrice: 250,
        totalPrice: 500,
      },
    ],
    partsTotal: 2300,
    serviceCharges: 500,
    grandTotal: 2800,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  it("renders multi-product table in Job Card when multiple products exist", () => {
    render(
      <JobCardPrintModal
        serviceCall={mockCall}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    // Verify multi-device header
    expect(screen.getAllByText(/Hardware \/ Device Details \(2 Items\)/i).length).toBeGreaterThan(0);
    // Verify both products
    expect(screen.getAllByText(/Lenovo ThinkPad E14/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/PF309ABC/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/HP LaserJet 1020/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/CNB88441/i).length).toBeGreaterThan(0);
  });

  it("renders spare parts in Job Card with showParts option enabled", () => {
    render(
      <JobCardPrintModal
        serviceCall={mockCall}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    // Verify spare parts section and items
    expect(screen.getAllByText(/Parts & Consumables Used \/ Required/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/RAM 8GB DDR4 Crucial/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Printer Paper Pickup Roller/i).length).toBeGreaterThan(0);
  });

  it("handles 2 products and 2 spare parts with zero clipping in Job Card", () => {
    render(
      <JobCardPrintModal
        serviceCall={mockCall}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    const styleTags = document.querySelectorAll("style");
    const styleContent = Array.from(styleTags).map((s) => s.textContent).join(" ");
    expect(styleContent).toContain("overflow: visible !important");
    expect(styleContent).not.toContain("max-height: 275mm !important");
  });
});

describe("ServiceCallDeviceDetailsCard Multi-Product Support", () => {
  const products: ServiceCallProduct[] = [
    {
      id: "p1",
      deviceCategory: "Laptop",
      modelNumber: "Dell Inspiron 3520",
      serialNumber: "DL12345",
      quantity: 1,
      warrantyStatus: "in_warranty",
      issueDescription: "Hinges broken",
    },
    {
      id: "p2",
      deviceCategory: "Desktop & All-in-One",
      modelNumber: "HP Pavilion 24",
      serialNumber: "HP9988",
      quantity: 1,
      warrantyStatus: "out_of_warranty",
      issueDescription: "No display on boot",
    },
  ];

  it("renders all products and triggers onAddProduct and onRemoveProduct", () => {
    const onAdd = vi.fn();
    const onRemove = vi.fn();
    const onUpdate = vi.fn();

    render(
      <ServiceCallDeviceDetailsCard
        products={products}
        onAddProduct={onAdd}
        onUpdateProduct={onUpdate}
        onRemoveProduct={onRemove}
        deviceCategory="Laptop"
        onDeviceCategoryChange={vi.fn()}
        categories={[{ id: "c1", name: "Laptop", createdAt: 0 }, { id: "c2", name: "Desktop & All-in-One", createdAt: 0 }]}
        onOpenAddCategoryModal={vi.fn()}
        warrantyStatus="in_warranty"
        onWarrantyStatusChange={vi.fn()}
        modelNumber="Dell Inspiron 3520"
        onModelNumberChange={vi.fn()}
        serialNumber="DL12345"
        onSerialNumberChange={vi.fn()}
        quantity={1}
        onQuantityChange={vi.fn()}
        dateOfPurchase=""
        onDateOfPurchaseChange={vi.fn()}
        billNumber=""
        onBillNumberChange={vi.fn()}
        issueDescription="Hinges broken"
        onIssueDescriptionChange={vi.fn()}
        type="company_service_center"
        serviceCenters={[]}
        selectedServiceCenterId=""
        onSelectServiceCenter={vi.fn()}
        onOpenAddCenterModal={vi.fn()}
        selectedAddressId=""
        onSelectAddress={vi.fn()}
        couriers={[]}
        courierName=""
        onSelectCourier={vi.fn()}
        onOpenAddCourierModal={vi.fn()}
        rmaNumber=""
        onRmaNumberChange={vi.fn()}
        courierChargesInput="0"
        onCourierChargesInputChange={vi.fn()}
        onsiteAddress=""
        onOnsiteAddressChange={vi.fn()}
        quickTags={[]}
      />
    );

    // Verify product count badge
    expect(screen.getByText("2 Products")).toBeInTheDocument();
    expect(screen.getByText("Product #1")).toBeInTheDocument();
    expect(screen.getByText("Product #2")).toBeInTheDocument();

    // Click "+ Add Another Product" button
    const addBtn = screen.getByText("+ Add Another Product");
    fireEvent.click(addBtn);
    expect(onAdd).toHaveBeenCalledTimes(1);

    // Click "Remove" button for product #2
    const removeBtns = screen.getAllByText("Remove");
    expect(removeBtns.length).toBe(2);
    fireEvent.click(removeBtns[1]);
    expect(onRemove).toHaveBeenCalledWith(1);
  });
});
