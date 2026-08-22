import { describe, it, expect } from "vitest";
import { toTitleCase, formatModelNumber } from "@/lib/utils";

describe("toTitleCase", () => {
  it("converts all-lowercase text to Title Case", () => {
    expect(toTitleCase("dell latitude 5420 i5")).toBe("Dell Latitude 5420 I5");
    expect(toTitleCase("john doe")).toBe("John Doe");
    expect(toTitleCase("acme infotech pvt ltd")).toBe("Acme Infotech Pvt Ltd");
  });

  it("converts ALL-UPPERCASE text to Title Case", () => {
    expect(toTitleCase("DELL LATITUDE 5420")).toBe("Dell Latitude 5420");
    expect(toTitleCase("MANISH MULCHANDANI")).toBe("Manish Mulchandani");
  });

  it("handles complex customer addresses properly", () => {
    expect(toTitleCase("shop no. 5, u-shape market, new delhi")).toBe(
      "Shop No. 5, U-Shape Market, New Delhi"
    );
    expect(toTitleCase("flat 402, tower b, sector 62, noida")).toBe(
      "Flat 402, Tower B, Sector 62, Noida"
    );
  });

  it("handles empty or falsy inputs gracefully", () => {
    expect(toTitleCase("")).toBe("");
    expect(toTitleCase(null as any)).toBe("");
    expect(toTitleCase(undefined as any)).toBe("");
  });
});

describe("formatModelNumber", () => {
  it("disallows spaces and converts them to hyphens", () => {
    expect(formatModelNumber("ThinkPad T480")).toBe("THINKPAD-T480");
    expect(formatModelNumber("DS 2CD2043G2 I")).toBe("DS-2CD2043G2-I");
    expect(formatModelNumber("latitude   5420")).toBe("LATITUDE-5420");
  });

  it("converts all lowercase to uppercase", () => {
    expect(formatModelNumber("g2100")).toBe("G2100");
    expect(formatModelNumber("ds-2cd2043g2-i")).toBe("DS-2CD2043G2-I");
  });

  it("strips illegal Firestore characters", () => {
    expect(formatModelNumber("model/part#1?")).toBe("MODEL-PART-1-");
  });

  it("handles empty or falsy input gracefully", () => {
    expect(formatModelNumber("")).toBe("");
    expect(formatModelNumber(null as any)).toBe("");
    expect(formatModelNumber(undefined as any)).toBe("");
  });
});
