import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import BrandTypeahead from "@/components/admin/BrandTypeahead";
import {
  TOP_HARDWARE_BRANDS,
  searchBrandSuggestions,
  mapCategoryToHardwareCategory,
} from "@/lib/constants";

describe("Top Hardware Brands & Search Suggestions", () => {
  it("contains over 100 categorized hardware brands", () => {
    expect(TOP_HARDWARE_BRANDS.length).toBeGreaterThanOrEqual(100);
  });

  it("maps Firestore categories correctly to hardware categories", () => {
    expect(mapCategoryToHardwareCategory("Laptops")).toBe("PC & Laptops");
    expect(mapCategoryToHardwareCategory("Desktop Computers")).toBe("PC & Laptops");
    expect(mapCategoryToHardwareCategory("CCTV Cameras")).toBe("CCTV & Security");
    expect(mapCategoryToHardwareCategory("Biometric Attendance")).toBe("CCTV & Security");
    expect(mapCategoryToHardwareCategory("Printers & Inks")).toBe("Printers & Scanners");
    expect(mapCategoryToHardwareCategory("Routers & Switches")).toBe("Networking & Power");
    expect(mapCategoryToHardwareCategory("Keyboards & Mice")).toBe("Peripherals");
    expect(mapCategoryToHardwareCategory("Hard Disks & SSDs")).toBe("Components & Storage");
  });

  it("prioritizes matching category brands when categoryHint is provided and NEVER returns empty", () => {
    const laptopBrands = searchBrandSuggestions("", 30, "Laptops");
    expect(laptopBrands.length).toBeGreaterThan(0);
    expect(laptopBrands[0].category).toBe("PC & Laptops");
    expect(laptopBrands.some((b) => b.name === "HP")).toBe(true);
    expect(laptopBrands.some((b) => b.name === "Dell")).toBe(true);

    const cctvBrands = searchBrandSuggestions("", 30, "CCTV Cameras");
    expect(cctvBrands.length).toBeGreaterThan(0);
    expect(cctvBrands[0].category).toBe("CCTV & Security");
    expect(cctvBrands.some((b) => b.name === "Hikvision")).toBe(true);
    expect(cctvBrands.some((b) => b.name === "CP Plus")).toBe(true);

    const printerBrands = searchBrandSuggestions("", 30, "Printers");
    expect(printerBrands.length).toBeGreaterThan(0);
    expect(printerBrands[0].category).toBe("Printers & Scanners");
    expect(printerBrands.some((b) => b.name === "Canon")).toBe(true);
    expect(printerBrands.some((b) => b.name === "Epson")).toBe(true);
  });

  it("returns balanced multi-category brands when query is empty and no category is given", () => {
    const results = searchBrandSuggestions("");
    expect(results.length).toBeGreaterThan(0);
    const categories = new Set(results.map((r) => r.category));
    expect(categories.size).toBeGreaterThanOrEqual(4);
    expect(categories.has("CCTV & Security")).toBe(true);
    expect(categories.has("Printers & Scanners")).toBe(true);
    expect(categories.has("PC & Laptops")).toBe(true);
  });

  it("filters suggestions by prefix and substring matches", () => {
    const hikMatches = searchBrandSuggestions("hik");
    expect(hikMatches.length).toBeGreaterThan(0);
    expect(hikMatches[0].name).toBe("Hikvision");

    const canonMatches = searchBrandSuggestions("canon");
    expect(canonMatches.some((b) => b.name === "Canon")).toBe(true);

    const cpMatches = searchBrandSuggestions("cp plus");
    expect(cpMatches.some((b) => b.name === "CP Plus")).toBe(true);
  });
});

describe("BrandTypeahead Component", () => {
  it("renders brand input with quick chips and allows typing", () => {
    let brandValue = "";
    const handleChange = (val: string) => {
      brandValue = val;
    };

    render(
      <BrandTypeahead
        value={brandValue}
        onChange={handleChange}
        showChips={true}
      />
    );

    const input = screen.getByPlaceholderText(/e\.g\. Hikvision \/ HP/i);
    expect(input).toBeInTheDocument();

    // Check that multi-category brand chips are visible
    expect(screen.getByRole("button", { name: "Hikvision" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "CP Plus" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Canon" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "HP" })).toBeInTheDocument();

    // Clicking a quick chip selects it
    fireEvent.click(screen.getByRole("button", { name: "Hikvision" }));
    expect(brandValue).toBe("Hikvision");
  });

  it("shows suggestions dropdown with relevant brands when categoryHint is passed", () => {
    let brandValue = "";
    const handleChange = (val: string) => {
      brandValue = val;
    };

    render(
      <BrandTypeahead
        value={brandValue}
        onChange={handleChange}
        categoryHint="CCTV Cameras"
        showChips={false}
      />
    );

    const input = screen.getByPlaceholderText(/e\.g\. Hikvision \/ HP/i);
    fireEvent.focus(input);

    // Initial dropdown shows CCTV brands at top
    expect(screen.getByText("Hikvision")).toBeInTheDocument();
    expect(screen.getByText("CP Plus")).toBeInTheDocument();
    expect(screen.getByText("Dahua")).toBeInTheDocument();
  });
});
