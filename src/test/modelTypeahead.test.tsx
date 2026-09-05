import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ModelTypeahead from "@/components/admin/ModelTypeahead";
import ServiceCallDeviceDetailsCard from "@/components/admin/service-call/ServiceCallDeviceDetailsCard";
import type { Product, DeviceCategory } from "@/lib/types";

// Mock searchProducts and getDeviceModels from firestore
const mockProducts: Product[] = [
  {
    id: "prod-1",
    name: "Hikvision 2MP IP Bullet Camera",
    model: "DS-2CD1023G0-I",
    brand: "Hikvision",
    categoryId: "CCTV Cameras",
    category: "CCTV Cameras",
    price: 1850,
    inStock: true,
  },
  {
    id: "prod-2",
    name: "Lenovo ThinkPad T480 Core i5 8th Gen",
    model: "T480",
    brand: "Lenovo",
    categoryId: "Laptops",
    category: "Laptops",
    price: 24500,
    inStock: true,
  },
  {
    id: "prod-3",
    name: "HP LaserJet Pro MFP M126nw Printer",
    model: "M126nw",
    brand: "HP",
    categoryId: "Printers",
    category: "Printers",
    price: 16200,
    inStock: true,
  },
] as unknown as Product[];

vi.mock("@/lib/firestore", async () => {
  const actual = await vi.importActual<any>("@/lib/firestore");
  return {
    ...actual,
    searchProducts: vi.fn(async (query: string) => {
      const q = (query || "").toLowerCase().trim();
      if (!q) return mockProducts;
      return mockProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.model && p.model.toLowerCase().includes(q)) ||
          (p.brand && p.brand.toLowerCase().includes(q))
      );
    }),
    getDeviceModels: vi.fn(async () => [
      { id: "dm-1", categoryName: "CCTV Cameras", modelName: "DS-2CD2043G2-I" },
    ]),
  };
});

describe("ModelTypeahead Catalog Integration (Quotation-Style)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders input with placeholder and triggers search on typing", async () => {
    const onChange = vi.fn();
    render(<ModelTypeahead value="" onChange={onChange} />);

    const input = screen.getByPlaceholderText(/Search 4000\+ catalog products/i);
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "T480" } });
    expect(onChange).toHaveBeenCalledWith("T480");

    await waitFor(() => {
      expect(screen.getByText("T480")).toBeInTheDocument();
      expect(screen.getByText(/Lenovo ThinkPad T480/i)).toBeInTheDocument();
      expect(screen.getByText("Lenovo")).toBeInTheDocument();
      expect(screen.getByText("Laptops")).toBeInTheDocument();
    });
  });

  it("allows selecting exact model via 'Pick Model' button", async () => {
    const onChange = vi.fn();
    const onSelectProduct = vi.fn();
    render(
      <ModelTypeahead
        value=""
        onChange={onChange}
        onSelectProduct={onSelectProduct}
      />
    );

    const input = screen.getByPlaceholderText(/Search 4000\+ catalog products/i);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "DS-2CD" } });

    await waitFor(() => {
      expect(screen.getAllByText(/DS-2CD1023G0-I/i).length).toBeGreaterThan(0);
    });

    const pickModelBtn = screen.getByRole("button", { name: /Pick Model/i });
    fireEvent.click(pickModelBtn);

    expect(onChange).toHaveBeenCalledWith("DS-2CD1023G0-I");
    expect(onSelectProduct).toHaveBeenCalledWith(
      expect.objectContaining({ model: "DS-2CD1023G0-I", brand: "Hikvision" })
    );
  });

  it("allows selecting product name via 'Pick Name' button", async () => {
    const onChange = vi.fn();
    const onSelectProduct = vi.fn();
    render(
      <ModelTypeahead
        value=""
        onChange={onChange}
        onSelectProduct={onSelectProduct}
      />
    );

    const input = screen.getByPlaceholderText(/Search 4000\+ catalog products/i);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "ThinkPad" } });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Pick Name/i })).toBeInTheDocument();
    });

    const pickNameBtn = screen.getByRole("button", { name: /Pick Name/i });
    fireEvent.click(pickNameBtn);

    expect(onChange).toHaveBeenCalledWith("Lenovo ThinkPad T480 Core i5 8th Gen");
    expect(onSelectProduct).toHaveBeenCalledWith(
      expect.objectContaining({ id: "prod-2" })
    );
  });

  it("clicking the row item selects the model number by default", async () => {
    const onChange = vi.fn();
    render(<ModelTypeahead value="" onChange={onChange} />);

    const input = screen.getByPlaceholderText(/Search 4000\+ catalog products/i);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "LaserJet" } });

    await waitFor(() => {
      expect(screen.getByText("M126nw")).toBeInTheDocument();
    });

    const rowItem = screen.getByText("M126nw").closest(".cursor-pointer");
    expect(rowItem).not.toBeNull();
    fireEvent.click(rowItem!);

    expect(onChange).toHaveBeenCalledWith("M126nw");
  });

  it("supports free typing with spaces without forcing hyphens or altering spaces", () => {
    const onChange = vi.fn();
    render(<ModelTypeahead value="ThinkPad T480s" onChange={onChange} />);

    const input = screen.getByDisplayValue("ThinkPad T480s") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "ThinkPad T480s Gen 2" } });

    expect(onChange).toHaveBeenCalledWith("ThinkPad T480s Gen 2");
  });
});

describe("ServiceCallDeviceDetailsCard Auto-Categorization", () => {
  const mockCategories: DeviceCategory[] = [
    { id: "cat-1", name: "CCTV Cameras", description: "", createdAt: Date.now() },
    { id: "cat-2", name: "Laptops", description: "", createdAt: Date.now() },
    { id: "cat-3", name: "Printers", description: "", createdAt: Date.now() },
  ];

  it("automatically sets deviceCategory when a catalog product is selected", async () => {
    let currentCategory = "";
    let currentModel = "";
    const onDeviceCategoryChange = vi.fn((val) => {
      currentCategory = val;
    });
    const onModelNumberChange = vi.fn((val) => {
      currentModel = val;
    });

    render(
      <ServiceCallDeviceDetailsCard
        deviceCategory={currentCategory}
        onDeviceCategoryChange={onDeviceCategoryChange}
        categories={mockCategories}
        onOpenAddCategoryModal={vi.fn()}
        warrantyStatus="in_warranty"
        onWarrantyStatusChange={vi.fn()}
        modelNumber={currentModel}
        onModelNumberChange={onModelNumberChange}
        serialNumber=""
        onSerialNumberChange={vi.fn()}
        quantity={1}
        onQuantityChange={vi.fn()}
        dateOfPurchase=""
        onDateOfPurchaseChange={vi.fn()}
        billNumber=""
        onBillNumberChange={vi.fn()}
        issueDescription=""
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
        courierChargesInput=""
        onCourierChargesInputChange={vi.fn()}
        onsiteAddress=""
        onOnsiteAddressChange={vi.fn()}
        quickTags={[]}
      />
    );

    const modelInput = screen.getByPlaceholderText(/Search 4000\+ products by model no/i);
    fireEvent.focus(modelInput);
    fireEvent.change(modelInput, { target: { value: "T480" } });

    await waitFor(() => {
      expect(screen.getByText("T480")).toBeInTheDocument();
    });

    const pickModelBtn = screen.getByRole("button", { name: /Pick Model/i });
    fireEvent.click(pickModelBtn);

    expect(onModelNumberChange).toHaveBeenCalledWith("T480");
    // Laptops category was automatically matched and selected!
    expect(onDeviceCategoryChange).toHaveBeenCalledWith("Laptops");
  });
});
