import { useEffect, useState, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  Pencil,
  Trash2,
  Package,
  Star,
  RefreshCw,
  Globe,
  EyeOff,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ConfirmDeleteDialog,
  EmptyState,
  FirebaseErrorState,
  TablePagination,
  SearchFilterBar,
  LoadingScreen,
} from "@/components/common";
import {
  getProducts,
  getProductsPaginated,
  searchProducts,
  syncProductIndex,
  getProductIndexCount,
  getCategories,
  deleteProduct,
  deleteProductPhoto,
  toggleProductWebsiteVisibility,
} from "@/lib/firestore";
import type { Product, Category } from "@/lib/types";
import { useTallyShortcuts } from "@/hooks/useTallyShortcuts";

type SortField = "name" | "category" | "price" | "stock" | "visibility" | "createdAt";
type SortDirection = "asc" | "desc";

export default function AdminProducts() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "website" | "erp">("all");
  
  // Interactive sorting state
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Pagination state
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  
  // Dialog / Action state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadData = async (forceRefresh = false) => {
    if (forceRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const [prods, cats] = await Promise.all([
        getProducts(forceRefresh),
        categories.length === 0 ? getCategories() : Promise.resolve(categories),
      ]);
      setProducts(prods);
      if (categories.length === 0) setCategories(cats);
    } catch (err: any) {
      console.error("Firebase connection error in AdminProducts:", err);
      setError(err?.message || "Firebase connection error. Could not connect to database.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(true);
  }, []);

  const catMap = useMemo(() => {
    return Object.fromEntries(categories.map((c) => [c.id, c.name]));
  }, [categories]);

  // Filter products by search, category, and website visibility
  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      // Category filter
      if (catFilter !== "all" && p.categoryId !== catFilter) {
        return false;
      }

      // Visibility filter
      if (visibilityFilter === "website" && p.showOnWebsite === false) {
        return false;
      }
      if (visibilityFilter === "erp" && p.showOnWebsite !== false) {
        return false;
      }

      // Search query filter across multiple fields
      if (q) {
        const nameMatch = p.name && p.name.toLowerCase().includes(q);
        const modelMatch = p.model && p.model.toLowerCase().includes(q);
        const brandMatch = p.brand && p.brand.toLowerCase().includes(q);
        const itemCodeMatch = p.itemCode && p.itemCode.toLowerCase().includes(q);
        const descMatch = p.description && p.description.toLowerCase().includes(q);
        const categoryName = catMap[p.categoryId]?.toLowerCase() || "";
        const catMatch = categoryName.includes(q);
        if (!nameMatch && !modelMatch && !brandMatch && !itemCodeMatch && !descMatch && !catMatch) {
          return false;
        }
      }

      return true;
    });
  }, [products, catFilter, visibilityFilter, search, catMap]);

  // Sort filtered products
  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name": {
          const nameA = (a.name || "").toLowerCase();
          const nameB = (b.name || "").toLowerCase();
          cmp = nameA.localeCompare(nameB);
          if (cmp === 0) {
            const modelA = (a.model || "").toLowerCase();
            const modelB = (b.model || "").toLowerCase();
            cmp = modelA.localeCompare(modelB);
          }
          break;
        }
        case "category": {
          const catA = (catMap[a.categoryId] || a.category || "").toLowerCase();
          const catB = (catMap[b.categoryId] || b.category || "").toLowerCase();
          cmp = catA.localeCompare(catB);
          if (cmp === 0) {
            cmp = (a.name || "").toLowerCase().localeCompare((b.name || "").toLowerCase());
          }
          break;
        }
        case "price": {
          const priceA = a.price != null ? Number(a.price) : null;
          const priceB = b.price != null ? Number(b.price) : null;
          if (priceA === null && priceB === null) {
            cmp = 0;
          } else if (priceA === null) {
            return 1;
          } else if (priceB === null) {
            return -1;
          } else {
            cmp = priceA - priceB;
          }
          break;
        }
        case "stock": {
          const stockA = a.inStock ? 1 : 0;
          const stockB = b.inStock ? 1 : 0;
          cmp = stockA - stockB;
          if (cmp === 0) {
            cmp = (a.name || "").toLowerCase().localeCompare((b.name || "").toLowerCase());
          }
          break;
        }
        case "visibility": {
          const visA = a.showOnWebsite !== false ? 1 : 0;
          const visB = b.showOnWebsite !== false ? 1 : 0;
          cmp = visA - visB;
          if (cmp === 0) {
            cmp = (a.name || "").toLowerCase().localeCompare((b.name || "").toLowerCase());
          }
          break;
        }
        case "createdAt": {
          const timeA = (a.createdAt as any)?.toMillis?.() ?? (typeof a.createdAt === "number" ? a.createdAt : 0);
          const timeB = (b.createdAt as any)?.toMillis?.() ?? (typeof b.createdAt === "number" ? b.createdAt : 0);
          cmp = timeA - timeB;
          break;
        }
        default:
          cmp = 0;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [filteredProducts, sortField, sortDirection, catMap]);

  // Reset page when filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, catFilter, visibilityFilter, pageSize]);

  // Sliced paginated results
  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedProducts = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return sortedProducts.slice(start, start + pageSize);
  }, [sortedProducts, safeCurrentPage, pageSize]);

  // Handle clickable header sort toggle
  const handleHeaderSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const renderSortHeader = (label: string, field: SortField, className = "") => {
    const isActive = sortField === field;
    return (
      <th
        className={`px-4 py-3 cursor-pointer select-none transition-colors hover:text-slate-900 dark:hover:text-white ${className}`}
        onClick={() => handleHeaderSort(field)}
        title={`Sort by ${label} (${isActive ? (sortDirection === "asc" ? "Ascending" : "Descending") : "Click to sort"})`}
      >
        <div className="flex items-center gap-1.5 group">
          <span className={isActive ? "text-[#2563EB] dark:text-blue-400 font-extrabold" : "text-slate-500 dark:text-slate-400"}>
            {label}
          </span>
          <span className="shrink-0">
            {isActive ? (
              sortDirection === "asc" ? (
                <ArrowUp className="h-3.5 w-3.5 text-[#2563EB] dark:text-blue-400" />
              ) : (
                <ArrowDown className="h-3.5 w-3.5 text-[#2563EB] dark:text-blue-400" />
              )
            ) : (
              <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-40 group-hover:opacity-100 transition-opacity" />
            )}
          </span>
        </div>
      </th>
    );
  };

  useTallyShortcuts({
    onAltC: () => navigate("/admin/products/new"),
    onAltA: () => navigate("/admin/products/new"),
  });

  const handleToggleVisibility = async (productId: string, currentVal: boolean | undefined) => {
    const nextVal = currentVal === false ? true : false;
    setTogglingId(productId);
    try {
      await toggleProductWebsiteVisibility(productId, nextVal);
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, showOnWebsite: nextVal } : p))
      );
      toast.success(
        nextVal
          ? "Product is now visible on public website"
          : "Product hidden from website (Internal/ERP only)"
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to update website visibility");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteProductPhoto(deleteId);
      await deleteProduct(deleteId);
      toast.success("Product deleted successfully");
      setProducts((prev) => prev.filter((p) => p.id !== deleteId));
      setDeleteId(null);
    } catch {
      toast.error("Failed to delete product");
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-6xl mx-auto text-xs">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-4 text-white shadow-md">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl font-extrabold font-display tracking-tight text-white leading-tight">
              Products & Inventory Directory
            </h1>
            <p className="text-xs text-slate-300">
              Manage stock inventory, unique model numbers, pricing, category mapping, and live stock status
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(true)}
              disabled={loading || refreshing}
              className="gap-1.5 font-semibold text-slate-200 border-slate-700 bg-slate-800/80 hover:bg-slate-700 hover:text-white rounded-xl h-9 text-xs shadow-sm shrink-0 cursor-pointer"
              title="Refresh product directory"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Link to="/admin/products/new">
              <Button
                size="sm"
                className="gap-1.5 font-bold bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl h-9 text-xs shadow-sm shrink-0 cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Add Product (Alt+C)
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <SearchFilterBar
        value={search}
        onChange={(val) => setSearch(val)}
        placeholder="Search by model, name, brand, code, category…"
        count={filteredProducts.length}
        countLabel="Total Products"
      >
        <Select value={catFilter} onValueChange={(v) => setCatFilter(v)}>
          <SelectTrigger className="w-full sm:w-40 h-9 text-xs rounded-xl">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent className="max-h-56">
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={visibilityFilter} onValueChange={(v: any) => setVisibilityFilter(v)}>
          <SelectTrigger className="w-full sm:w-36 h-9 text-xs rounded-xl">
            <SelectValue placeholder="All Visibility" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Visibility</SelectItem>
            <SelectItem value="website">🌐 Visible on Web</SelectItem>
            <SelectItem value="erp">🔒 ERP Only</SelectItem>
          </SelectContent>
        </Select>

        <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
          <SelectTrigger className="w-full sm:w-28 h-9 text-xs rounded-xl">
            <SelectValue placeholder="Page Size" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10 / page</SelectItem>
            <SelectItem value="25">25 / page</SelectItem>
            <SelectItem value="50">50 / page</SelectItem>
            <SelectItem value="100">100 / page</SelectItem>
          </SelectContent>
        </Select>
      </SearchFilterBar>

      {/* Table / Loading / Error */}
      {loading ? (
        <div className="bg-card rounded-2xl border p-6">
          <LoadingScreen fullScreen={false} title="Products Catalog" subtitle="Loading products inventory..." />
        </div>
      ) : error ? (
        <FirebaseErrorState
          error={error}
          onRetry={() => loadData(true)}
          title="Catalog Sync Error"
        />
      ) : filteredProducts.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No Products Found"
          description={
            search || catFilter !== "all" || visibilityFilter !== "all"
              ? "Try adjusting your search query, category, or visibility filter."
              : "No products added to catalog yet. Click Add Product to create your first stock item."
          }
          actionLabel="Add Product"
          actionIcon={Plus}
          onAction={() => navigate("/admin/products/new")}
        />
      ) : (
        <div className="rounded-2xl border bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider text-[10px]">
                <tr>
                  {renderSortHeader("Product & Model", "name", "min-w-[220px]")}
                  {renderSortHeader("Category", "category", "min-w-[120px]")}
                  {renderSortHeader("Price", "price", "min-w-[100px]")}
                  {renderSortHeader("Stock Status", "stock", "min-w-[110px]")}
                  {renderSortHeader("Website Listing", "visibility", "min-w-[120px]")}
                  <th className="px-4 py-3 text-right min-w-[90px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedProducts.map((product) => (
                  <tr
                    key={product.id}
                    onClick={() => navigate(`/admin/products/${product.id}/edit`)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-900/60 transition-colors cursor-pointer group"
                    title={`Click row to edit ${product.name}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {product.photoUrl ? (
                          <img
                            src={product.photoUrl}
                            alt={product.name}
                            className="h-10 w-10 rounded-xl object-contain shrink-0 border bg-white p-1"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-slate-50 dark:bg-slate-900 group-hover:border-blue-200 dark:group-hover:border-blue-800 transition-colors">
                            <Package className="h-4 w-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white group-hover:text-[#2563EB] dark:group-hover:text-blue-400 transition-colors">
                            <span className="truncate">{product.name}</span>
                            {product.featured && (
                              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {product.model && (
                              <span className="font-mono text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.2 rounded border border-blue-200 dark:border-blue-800">
                                {product.model}
                              </span>
                            )}
                            {product.brand && (
                              <span className="text-[11px] text-slate-400">· {product.brand}</span>
                            )}
                            {product.itemCode && (
                              <span className="text-[10px] text-slate-400 font-mono">[{product.itemCode}]</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-medium">
                      {catMap[product.categoryId] ?? product.category ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {product.price != null ? (
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white">
                            ₹{product.price.toLocaleString("en-IN")}
                          </span>
                          {product.showPriceOnWebsite === false && (
                            <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-sans font-medium">
                              (Web: Call for Price)
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 font-normal">Contact for Price</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={product.inStock ? "default" : "secondary"}
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          product.inStock
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        {product.inStock ? "In Stock" : "Out of Stock"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={togglingId === product.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleVisibility(product.id, product.showOnWebsite);
                        }}
                        title="Click to toggle website catalog visibility"
                        className="cursor-pointer transition-transform active:scale-95 text-left"
                      >
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1.5 transition-colors ${
                            product.showOnWebsite !== false
                              ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800/50 hover:bg-blue-100"
                              : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          {product.showOnWebsite !== false ? (
                            <>
                              <Globe className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                              <span>Visible</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-3 w-3 text-slate-400" />
                              <span>ERP Only</span>
                            </>
                          )}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/admin/products/${product.id}/edit`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                            title="Edit Product"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(product.id);
                          }}
                          title="Delete Product"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Footer */}
      {!loading && !error && filteredProducts.length > 0 && (
        <TablePagination
          pageNumber={safeCurrentPage}
          currentItemsCount={paginatedProducts.length}
          hasMore={safeCurrentPage < totalPages}
          totalPages={totalPages}
          isLoading={loading || refreshing}
          pageSize={pageSize}
          label="products"
          onPageChange={(newPage) => {
            setCurrentPage(Math.max(1, Math.min(totalPages, newPage)));
          }}
        />
      )}

      {/* Delete Confirmation Alert */}
      <ConfirmDeleteDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Product?"
        description="This will permanently delete this product and remove its image from storage. This action cannot be undone."
        confirmLabel="Delete Product"
        onConfirm={handleDelete}
      />
    </div>
  );
}

