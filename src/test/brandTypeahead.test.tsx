import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import BrandTypeahead from "@/components/admin/BrandTypeahead";
import {
  TOP_HARDWARE_BRANDS,
  searchBrandSuggestions,
} from "@/lib/constants";

describe("Top Hardware Brands & Search Suggestions", () => {
  it("contains over 100 categorized hardware brands", () => {
    expect(TOP_HARDWARE_BRANDS.length).toBeGreaterThanOrEqual(100);
  });

  it("includes top PC, Printer, Camera, and Component brands", () => {
    const brandNames = TOP_HARDWARE_BRANDS.map((b) => b.name.toLowerCase());
    // PCs & Laptops
    expect(brandNames).toContain("hp");
    expect(brandNames).toContain("dell");
    expect(brandNames).toContain("lenovo");
    expect(brandNames).toContain("asus");
    expect(brandNames).toContain("apple");

    // Printers & Scanners
    expect(brandNames).toContain("canon");
    expect(brandNames).toContain("epson");
    expect(brandNames).toContain("brother");
    expect(brandNames).toContain("tvs electronics");

    // CCTV, Security & Cameras
    expect(brandNames).toContain("hikvision");
    expect(brandNames).toContain("cp plus");
    expect(brandNames).toContain("dahua");
    expect(brandNames).toContain("ezviz");
    expect(brandNames).toContain("tp-link tapo");
    expect(brandNames).toContain("essl");

    // Components & Networking
    expect(brandNames).toContain("western digital (wd)");
    expect(brandNames).toContain("seagate");
    expect(brandNames).toContain("kingston");
    expect(brandNames).toContain("d-link");
    expect(brandNames).toContain("tp-link");
    expect(brandNames).toContain("logitech");
  });

  it("returns balanced multi-category brands when query is empty", () => {
    const results = searchBrandSuggestions("");
    expect(results.length).toBeGreaterThan(0);
    const categories = new Set(results.map((r) => r.category));
    // Verify it contains multiple categories (CCTV, Printers, PCs, etc.)
    expect(categories.size).toBeGreaterThanOrEqual(4);
    expect(categories.has("CCTV & Security")).toBe(true);
    expect(categories.has("Printers & Scanners")).toBe(true);
    expect(categories.has("PC & Laptops")).toBe(true);
  });

  it("filters suggestions by category", () => {
    const cctvResults = searchBrandSuggestions("", 20, "CCTV & Security");
    expect(cctvResults.length).toBeGreaterThan(0);
    expect(cctvResults.every((b) => b.category === "CCTV & Security")).toBe(true);
    expect(cctvResults.some((b) => b.name === "Hikvision")).toBe(true);
    expect(cctvResults.some((b) => b.name === "CP Plus")).toBe(true);
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

  it("shows clean suggestions dropdown when focused and filters on typing", () => {
    let brandValue = "";
    const handleChange = (val: string) => {
      brandValue = val;
    };

    render(
      <BrandTypeahead
        value={brandValue}
        onChange={handleChange}
        showChips={false}
      />
    );

    const input = screen.getByPlaceholderText(/e\.g\. Hikvision \/ HP/i);
    fireEvent.focus(input);

    // Initial dropdown shows balanced multi-category top brands
    expect(screen.getByText("Hikvision")).toBeInTheDocument();
    expect(screen.getByText("Canon")).toBeInTheDocument();
    expect(screen.getByText("Dell")).toBeInTheDocument();

    // Type query to filter
    fireEvent.change(input, { target: { value: "epson" } });
    expect(screen.getByText("Epson")).toBeInTheDocument();
  });
});
