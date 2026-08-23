import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Package, Star, Search, RefreshCw, Globe, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  getProducts,
  getCategories,
  deleteProduct,
  deleteProductPhoto,
  toggleProductWebsiteVisibility,
} from "@/lib/firestore";
import type { Product, Category } from "@/lib/types";
import { useTallyShortcuts } from "@/hooks/useTallyShortcuts";

export default function AdminProducts() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "website" | "erp">("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [prods, cats] = await Promise.all([getProducts(), getCategories()]);
      setProducts(prods);
      setCategories(cats);
    } catch (err: any) {
      console.error("Firebase connection error in AdminProducts:", err);
      setError(err?.message || "Firebase connection error. Could not connect to database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

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
      setDeleteId(null);
      load();
    } catch {
      toast.error("Failed to delete product");
    }
  };

  const catMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  const filtered = products
    .filter((p) => {
      const matchesCat = catFilter === "all" || p.categoryId === catFilter;
      const isVisible = p.showOnWebsite !== false;
      const matchesVisibility =
        visibilityFilter === "all" ||
        (visibilityFilter === "website" && isVisible) ||
        (visibilityFilter === "erp" && !isVisible);

      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.model && p.model.toLowerCase().includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.itemCode && p.itemCode.toLowerCase().includes(q));
      return matchesCat && matchesVisibility && matchesSearch;
    })
    .sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      if (a.order != null && b.order != null) return a.order - b.order;
      if (a.order != null) return -1;
      if (b.order != null) return 1;
      return (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0);
    });

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

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 w-full max-w-xl">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by model, name, brand, code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl w-full"
            />
          </div>

          <Select value={catFilter} onValueChange={setCatFilter}>
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
        </div>

        <div className="text-xs text-muted-foreground font-semibold">
          Total Products: <span className="text-foreground font-extrabold">{filtered.length}</span>
        </div>
      </div>

      {/* Table / Loading / Error */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card rounded-2xl border">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mb-2" />
          <p className="text-xs text-muted-foreground">Loading products catalog...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border bg-destructive/5 border-destructive/20 py-16 text-center px-4">
          <p className="font-bold text-destructive text-base">Error Loading Products</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-md">{error}</p>
          <Button onClick={() => load()} className="mt-4 gap-2 text-xs" variant="outline" size="sm">
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-card rounded-2xl border text-center p-6 space-y-3">
          <Package className="h-10 w-10 text-muted-foreground/40" />
          <p className="font-bold text-foreground text-sm">No Products Found</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            {products.length === 0
              ? "No products added to catalog yet. Click Add Product to create your first stock item."
              : "Try adjusting your search query, category, or visibility filter."}
          </p>
          <Link to="/admin/products/new">
            <Button size="sm" className="gap-1 text-xs font-bold bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl">
              <Plus className="h-3.5 w-3.5" /> Add Product
            </Button>
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Product & Model</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Stock Status</th>
                  <th className="px-4 py-3">Website Listing</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {product.photoUrl ? (
                          <img
                            src={product.photoUrl}
                            alt={product.name}
                            className="h-10 w-10 rounded-xl object-contain shrink-0 border bg-white p-1"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-slate-50 dark:bg-slate-900">
                            <Package className="h-4 w-4 text-slate-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
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
                      {catMap[product.categoryId] ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                      {product.price != null ? (
                        <span>₹{product.price.toLocaleString("en-IN")}</span>
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
                        onClick={() => handleToggleVisibility(product.id, product.showOnWebsite)}
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
                        <Link to={`/admin/products/${product.id}/edit`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteId(product.id)}
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

      {/* Delete Confirmation Alert */}
      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Delete Product?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This will permanently delete this product and remove its image from storage. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="h-8 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
