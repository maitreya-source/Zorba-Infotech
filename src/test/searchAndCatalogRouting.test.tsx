import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import SearchBar from "@/components/home/SearchBar";
import * as firestoreModule from "@/lib/firestore";

describe("Category-Driven SearchBar Component (Task 3)", () => {
  it("renders search input with placeholder", () => {
    render(
      <MemoryRouter>
        <SearchBar />
      </MemoryRouter>
    );

    expect(
      screen.getByPlaceholderText(/Search categories/i)
    ).toBeInTheDocument();
  });

  it("opens category dropdown on focus and shows categories and popular chips", async () => {
    vi.spyOn(firestoreModule, "getCategories").mockResolvedValue([
      { id: "laptop", name: "Laptops & Notebooks", iconName: "Laptop", description: "HP, Dell, Lenovo" },
      { id: "cctv", name: "CCTV & Security", iconName: "Camera", description: "IP & 4G Cameras" },
    ] as any);

    render(
      <MemoryRouter>
        <SearchBar />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/Search categories/i);
    fireEvent.focus(input);

    await waitFor(() => {
      expect(screen.getByText(/Categories/i)).toBeInTheDocument();
      expect(screen.getByText(/Popular Searches/i)).toBeInTheDocument();
      expect(screen.getByText(/CCTV 4G SIM/i)).toBeInTheDocument();
    });
  });

  it("filters categories when user types in the input without triggering Firestore read", async () => {
    vi.spyOn(firestoreModule, "getCategories").mockResolvedValue([
      { id: "laptop", name: "Laptops & Notebooks", iconName: "Laptop", description: "HP, Dell, Lenovo" },
      { id: "cctv", name: "CCTV & Security", iconName: "Camera", description: "IP & 4G Cameras" },
    ] as any);

    render(
      <MemoryRouter>
        <SearchBar />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/Search categories/i);
    fireEvent.change(input, { target: { value: "cctv" } });

    await waitFor(() => {
      expect(screen.getByText(/CCTV & Security/i)).toBeInTheDocument();
      expect(screen.queryByText(/Laptops & Notebooks/i)).toBeNull();
    });
  });
});
