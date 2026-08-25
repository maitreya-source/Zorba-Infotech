import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminProducts from "@/pages/admin/AdminProducts";
import * as firestoreModule from "@/lib/firestore";
import type { Product, Category } from "@/lib/types";

describe("AdminProducts Table Sorting & Pagination", () => {
  const mockCategories: Category[] = [
    { id: "cat-1", name: "Laptops", iconName: "Laptop", color: "#2563EB", order: 1, createdAt: {} as any },
    { id: "cat-2", name: "CCTV", iconName: "Camera", color: "#10B981", order: 2, createdAt: {} as any },
  ];

  // Generate 35 mock products so pagination (25 per page) has 2 pages
  const mockProducts: Product[] = Array.from({ length: 35 }, (_, i) => {
    const num = i + 1;
    return {
      id: `prod-${num}`,
      name: num % 2 === 0 ? `Dell Inspiron Model ${num}` : `Apple MacBook Pro ${num}`,
      brand: num % 2 === 0 ? "Dell" : "Apple",
      model: `MOD-${String(num).padStart(3, "0")}`,
      itemCode: `ITEM-${num}`,
      warranty: "1 Year",
      serviceCenter: "Neemuch",
      productUrl: "",
      price: (35 - num + 1) * 1000, // Descending price initially
      description: `Description for product ${num}`,
      photoUrl: null,
      categoryId: num % 2 === 0 ? "cat-1" : "cat-2",
      inStock: num % 3 !== 0,
      featured: num === 1,
      showOnWebsite: num % 4 !== 0,
      order: num,
      customFields: [],
    };
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(firestoreModule, "getCategories").mockResolvedValue(mockCategories);
    vi.spyOn(firestoreModule, "getProducts").mockResolvedValue(mockProducts);
  });

  it("renders products list and displays total products count and page 1 pagination", async () => {
    render(
      <MemoryRouter>
        <AdminProducts />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Products & Inventory Directory")).toBeInTheDocument();
      // Total count badge
      expect(screen.getByText("35")).toBeInTheDocument();
      // Verify pagination renders Page 1
      expect(screen.getByText("Page 1 of 2", { exact: false })).toBeInTheDocument();
    });
  });

  it("navigates to next page and displays remaining products when clicking Next", async () => {
    render(
      <MemoryRouter>
        <AdminProducts />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Page 1 of 2/i)).toBeInTheDocument();
    });

    // Click Next page button
    const nextBtn = screen.getByRole("button", { name: /next/i });
    expect(nextBtn).not.toBeDisabled();
    fireEvent.click(nextBtn);

    // Page 2 should display
    await waitFor(() => {
      expect(screen.getByText(/Page 2 of 2/i)).toBeInTheDocument();
    });

    // On page 2, Next button should now be disabled
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();

    // Click Previous button
    const prevBtn = screen.getByRole("button", { name: /previous/i });
    expect(prevBtn).not.toBeDisabled();
    fireEvent.click(prevBtn);

    // Should return to Page 1
    await waitFor(() => {
      expect(screen.getByText(/Page 1 of 2/i)).toBeInTheDocument();
    });
  });

  it("sorts table by Price ascending and descending when Price header is clicked", async () => {
    render(
      <MemoryRouter>
        <AdminProducts />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Products & Inventory Directory/i)).toBeInTheDocument();
    });

    const priceHeader = screen.getByTitle(/Sort by Price/i);
    expect(priceHeader).toBeInTheDocument();

    // 1. Click to sort by Price (asc)
    fireEvent.click(priceHeader);

    await waitFor(() => {
      // Smallest price among 35 products is ₹1,000 (prod-35)
      expect(screen.getByText("₹1,000")).toBeInTheDocument();
    });

    // 2. Click again to sort by Price (desc)
    fireEvent.click(priceHeader);

    await waitFor(() => {
      // Highest price among 35 products is ₹35,000 (prod-1)
      expect(screen.getByText("₹35,000")).toBeInTheDocument();
    });
  });

  it("sorts table by Product & Model name when header is clicked", async () => {
    render(
      <MemoryRouter>
        <AdminProducts />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Products & Inventory Directory/i)).toBeInTheDocument();
    });

    const nameHeader = screen.getByTitle(/Sort by Product & Model/i);
    // Click to sort by name descending
    fireEvent.click(nameHeader); // toggle from default asc to desc

    await waitFor(() => {
      // In descending order, Dell Inspiron Model 34 should be on page 1
      expect(screen.getByText("Dell Inspiron Model 34")).toBeInTheDocument();
    });
  });

  it("resets page index to 1 when search query is entered", async () => {
    render(
      <MemoryRouter>
        <AdminProducts />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Page 1 of 2/i)).toBeInTheDocument();
    });

    // Go to Page 2 first
    const nextBtn = screen.getByRole("button", { name: /next/i });
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(screen.getByText(/Page 2 of 2/i)).toBeInTheDocument();
    });

    // Type in search bar
    const searchInput = screen.getByPlaceholderText(/Search by model, name, brand, code, category…/i);
    fireEvent.change(searchInput, { target: { value: "Apple" } });

    // Should automatically reset to Page 1 with filtered results
    await waitFor(() => {
      expect(screen.getByText(/Page 1 of/i)).toBeInTheDocument();
    });
  });
});
