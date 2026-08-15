import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Package, Search, Star } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Badge } from "@/components/ui/badge";
import { getProducts, getCategories } from "@/lib/firestore";
import { getIcon } from "@/lib/icons";
import type { Product, Category } from "@/lib/types";

function sortProducts(products: Product[]): Product[] {
  return [...products].sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    if (a.order != null && b.order != null) return a.order - b.order;
    if (a.order != null) return -1;
    if (b.order != null) return 1;
    return (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0);
  });
}

export default function Catalog() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [prods, cats] = await Promise.all([getProducts(), getCategories()]);
      setProducts(sortProducts(prods));
      setCategories(cats);
    } catch (err: any) {
      console.error("Firebase error in Catalog:", err);
      setError(err?.message || "Failed to load catalog from Firebase.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);


  const catMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  const filtered = products.filter((p) => {
    const matchesCat = activeCategory === "all" || p.categoryId === activeCategory;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.brand?.toLowerCase().includes(q) ||
      p.model?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  return (
    <Layout>
      <SEO
        title="Product Catalog – Zorba Infotech | Latest IT Products in Neemuch"
        description="Browse the latest IT products at Zorba Infotech Neemuch — laptops, cameras, networking, accessories and more. Updated regularly."
        path="/catalog"
      />

      {/* Hero */}
      <section className="bg-gradient-hero py-16 text-primary-foreground">
        <div className="container mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-1.5 text-sm font-medium backdrop-blur-sm mb-4">
            <Package className="h-3.5 w-3.5" />
            New Arrivals & Stock
          </span>
          <h1 className="text-3xl font-bold font-display md:text-4xl">Product Catalog</h1>
          <p className="mt-3 text-primary-foreground/80 max-w-xl mx-auto">
            Browse our latest products with live pricing and availability.
          </p>

          <div className="mt-6 max-w-md mx-auto relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary-foreground/40" />
            <input
              type="text"
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-primary-foreground/20 bg-primary-foreground/10 pl-10 pr-4 py-2.5 text-sm text-primary-foreground placeholder:text-primary-foreground/40 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary-foreground/30"
            />
          </div>
        </div>
      </section>

      {/* Category tabs */}
      <div className="border-b sticky top-16 z-30 bg-card/95 backdrop-blur">
        <div className="container">
          <div className="flex gap-1 overflow-x-auto py-3 scrollbar-none">
            <button
              onClick={() => setActiveCategory("all")}
              className={`shrink-0 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                activeCategory === "all"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              All Products
            </button>
            {categories.map((cat) => {
              const Icon = getIcon(cat.iconName);
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`shrink-0 flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                    activeCategory === cat.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Products grid */}
      <section className="container py-10">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border rounded-2xl bg-destructive/5 border-destructive/20 px-4">
            <p className="font-bold text-destructive text-lg">Firebase Connection Error</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">{error}</p>
            <button
              onClick={() => loadData()}
              className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Retry Connection
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Package className="h-16 w-16 text-muted-foreground/20 mb-4" />
            <p className="text-lg font-semibold">No products found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {products.length === 0
                ? "No products have been added yet. Check back soon!"
                : "Try a different search or category."}
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-6">
              {filtered.length} product{filtered.length !== 1 ? "s" : ""}
              {activeCategory !== "all" && ` in ${catMap[activeCategory] ?? "this category"}`}
              {search && ` matching "${search}"`}
            </p>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  categoryName={catMap[product.categoryId]}
                  onClick={() => navigate(`/catalog/${product.id}`)}
                />
              ))}
            </div>
          </>
        )}
      </section>
    </Layout>
  );
}

function ProductCard({
  product,
  categoryName,
  onClick,
}: {
  product: Product;
  categoryName?: string;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col rounded-2xl border bg-card overflow-hidden cursor-pointer hover:shadow-lg hover:border-primary/20 transition-all duration-300"
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-muted/30">
        {product.photoUrl ? (
          <img
            src={product.photoUrl}
            alt={product.name}
            className="h-full w-full object-contain p-4 transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="h-16 w-16 text-muted-foreground/20" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.featured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white">
              <Star className="h-3 w-3 fill-white" /> Featured
            </span>
          )}
          {!product.inStock && (
            <span className="inline-flex items-center rounded-full bg-destructive/90 px-2 py-0.5 text-xs font-semibold text-white">
              Out of Stock
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 p-4 gap-2">
        {categoryName && (
          <span className="text-xs font-semibold text-primary uppercase tracking-wide">
            {categoryName}
          </span>
        )}
        <h3 className="font-bold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {product.name}
        </h3>
        {product.model && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
              Model: {product.model}
            </span>
            {product.brand && (
              <span className="text-xs text-muted-foreground">· {product.brand}</span>
            )}
          </div>
        )}

        <div className="mt-auto pt-2 flex items-center justify-between">
          {product.price != null ? (
            <span className="text-lg font-bold text-primary">
              ₹{product.price.toLocaleString("en-IN")}
            </span>
          ) : (
            <span className="text-sm font-medium text-muted-foreground">Contact for price</span>
          )}
          {product.inStock && (
            <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200 bg-emerald-50">
              In Stock
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
