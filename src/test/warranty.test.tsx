import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import WarrantySelector from "@/components/admin/WarrantySelector";
import {
  buildWarrantyString,
  parseWarrantyString,
  DEFAULT_WARRANTY,
} from "@/lib/constants";

describe("Warranty Builder & Parser (Style B - Formal Invoice / Legal Contract)", () => {
  it("builds standard warranty string with period, by, and type", () => {
    const result = buildWarrantyString({
      period: "1 Year",
      by: "Brand",
      type: "Carry-In Limited Warranty",
    });
    expect(result).toBe(
      "1 Year Carry-In Limited Warranty by Brand, subject to Company Terms & Conditions."
    );
  });

  it("builds onsite warranty string correctly", () => {
    const result = buildWarrantyString({
      period: "3 Years",
      by: "Brand",
      type: "Toll-Free Onsite Warranty",
    });
    expect(result).toBe(
      "3 Years Toll-Free Onsite Warranty by Brand, subject to Company Terms & Conditions."
    );
  });

  it("builds vendor warranty string correctly", () => {
    const result = buildWarrantyString({
      period: "6 Months",
      by: "Vendor",
      type: "Carry-In Limited Warranty",
    });
    expect(result).toBe(
      "6 Months Carry-In Limited Warranty by Vendor, subject to Company Terms & Conditions."
    );
  });

  it("handles No Warranty correctly", () => {
    const result = buildWarrantyString({
      period: "No Warranty",
      by: "Brand",
      type: "Carry-In Limited Warranty",
    });
    expect(result).toBe(
      "No Warranty (Testing Warranty Only, subject to Company Terms & Conditions)."
    );
  });

  it("parses Style B standard brand carry-in warranty string", () => {
    const parsed = parseWarrantyString(
      "2 Years Carry-In Limited Warranty by Brand, subject to Company Terms & Conditions."
    );
    expect(parsed.period).toBe("2 Years");
    expect(parsed.by).toBe("Brand");
    expect(parsed.type).toBe("Carry-In Limited Warranty");
    expect(parsed.isCustom).toBe(false);
  });

  it("parses unhyphenated brand carry-in warranty string", () => {
    const parsed = parseWarrantyString(
      "2 Years Carry In Limited Warranty by Brand, subject to Company Terms & Conditions."
    );
    expect(parsed.period).toBe("2 Years");
    expect(parsed.by).toBe("Brand");
    expect(parsed.type).toBe("Carry-In Limited Warranty");
    expect(parsed.isCustom).toBe(false);
  });

  it("parses legacy hyphenated brand carry-in warranty string", () => {
    const parsed = parseWarrantyString(
      "2 Years Carry In Limited Warranty By Brand - and Warranty As Per Company Rules & Regulations."
    );
    expect(parsed.period).toBe("2 Years");
    expect(parsed.by).toBe("Brand");
    expect(parsed.type).toBe("Carry-In Limited Warranty");
    expect(parsed.isCustom).toBe(false);
  });

  it("parses toll-free onsite warranty string", () => {
    const parsed = parseWarrantyString(
      "1 Year Toll-Free Onsite Warranty by Brand, subject to Company Terms & Conditions."
    );
    expect(parsed.period).toBe("1 Year");
    expect(parsed.by).toBe("Brand");
    expect(parsed.type).toBe("Toll-Free Onsite Warranty");
    expect(parsed.isCustom).toBe(false);
  });

  it("parses vendor warranty string", () => {
    const parsed = parseWarrantyString(
      "1 Month Carry-In Limited Warranty by Vendor, subject to Company Terms & Conditions."
    );
    expect(parsed.period).toBe("1 Month");
    expect(parsed.by).toBe("Vendor");
    expect(parsed.type).toBe("Carry-In Limited Warranty");
    expect(parsed.isCustom).toBe(false);
  });

  it("detects non-standard strings as custom", () => {
    const parsed = parseWarrantyString("6 Months Special Testing Warranty Only");
    expect(parsed.isCustom).toBe(true);
    expect(parsed.customText).toBe("6 Months Special Testing Warranty Only");
  });
});

describe("WarrantySelector Component", () => {
  it("renders 3 component selectors and default composed string", () => {
    let currentValue = DEFAULT_WARRANTY;
    const handleChange = (val: string) => {
      currentValue = val;
    };

    render(
      <WarrantySelector
        value={currentValue}
        onChange={handleChange}
      />
    );

    expect(screen.getByText("Warranty Policy & Terms")).toBeInTheDocument();
    expect(screen.getByText("1. Warranty Period")).toBeInTheDocument();
    expect(screen.getByText("2. Warranty By")).toBeInTheDocument();
    expect(screen.getByText("3. Warranty Type")).toBeInTheDocument();
    expect(screen.getByText("Custom Text Mode")).toBeInTheDocument();
  });

  it("allows switching to custom text mode and entering custom clause", () => {
    let currentValue = DEFAULT_WARRANTY;
    const handleChange = (val: string) => {
      currentValue = val;
    };

    render(
      <WarrantySelector
        value={currentValue}
        onChange={handleChange}
      />
    );

    const customSwitch = screen.getByRole("switch", { name: /toggle custom warranty text mode/i });
    fireEvent.click(customSwitch);

    const customInput = screen.getByPlaceholderText(/Type custom warranty clause.../i);
    expect(customInput).toBeInTheDocument();

    fireEvent.change(customInput, { target: { value: "Special 45 Days Warranty" } });
    expect(currentValue).toBe("Special 45 Days Warranty");
  });
});
