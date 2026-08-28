import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Package, Search, Star, Loader2 } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import LoadingScreen from "@/components/common/LoadingScreen";
import { getPublicProducts, getCategories } from "@/lib/firestore";
import { getIcon } from "@/lib/icons";
import type { Product, Category } from "@/lib/types";

export default function Catalog() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [offset, setOffset] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const categoryFromUrl = searchParams.get("category");
  const searchFromUrl = searchParams.get("search") || searchParams.get("q");

  const [activeCategory, setActiveCategory] = useState(categoryFromUrl || "all");
  const [search, setSearch] = useState(searchFromUrl || "");
  const searchDebounceRef = useRef<any>(null);

  useEffect(() => {
    if (categoryFromUrl) {
      setActiveCategory(categoryFromUrl);
    }
  }, [categoryFromUrl]);

  useEffect(() => {
    if (searchFromUrl !== null && searchFromUrl !== undefined) {
      setSearch(searchFromUrl);
    }
  }, [searchFromUrl]);

  // Load categories once
  useEffect(() => {
    getCategories()
      .then((cats) => setCategories(cats))
      .catch((err) => console.error("Error loading categories:", err));
  }, []);

  const loadInitialProducts = async (cat: string, queryStr: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPublicProducts({
        categoryId: cat !== "all" ? cat : undefined,
        search: queryStr.trim(),
        pageSize: 24,
        offset: 0,
      });
      setProducts(res.items);
      setHasMore(res.hasMore);
      setTotalCount(res.totalCount || res.items.length);
      setOffset(24);
    } catch (err: any) {
      console.error("Firebase error in Catalog:", err);
      setError(err?.message || "Failed to load catalog.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await getPublicProducts({
        categoryId: activeCategory !== "all" ? activeCategory : undefined,
        search: search.trim(),
        pageSize: 24,
        offset: offset,
      });
      setProducts((prev) => [...prev, ...res.items]);
      setHasMore(res.hasMore);
      setOffset((prev) => prev + 24);
    } catch (err: any) {
      console.error("Error loading more products:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadInitialProducts(activeCategory, search);
  }, [activeCategory]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      loadInitialProducts(activeCategory, val);
    }, 300);
  };

  const catMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));


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
            Browse our catalog and inquire directly for wholesale &amp; retail pricing.
          </p>

          <div className="mt-6 max-w-md mx-auto relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary-foreground/40" />
            <input
              type="text"
              placeholder="Search products…"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
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
          <LoadingScreen
            fullScreen={false}
            title="Product Catalog"
            subtitle="Loading products & inventory..."
          />
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border rounded-2xl bg-destructive/5 border-destructive/20 px-4">
            <p className="font-bold text-destructive text-lg">Firebase Connection Error</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">{error}</p>
            <button
              onClick={() => loadInitialProducts(activeCategory, search)}
              className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Retry Connection
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Package className="h-16 w-16 text-muted-foreground/20 mb-4" />
            <p className="text-lg font-semibold">No products found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {search
                ? `No products match "${search}".`
                : "No products in this category yet. Check back soon!"}
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-6">
              Showing {products.length} of {totalCount} {search ? "matching" : "in-stock"} product{totalCount !== 1 ? "s" : ""}
              {activeCategory !== "all" && ` in ${catMap[activeCategory] ?? "this category"}`}
              {search && ` matching "${search}"`}
            </p>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  categoryName={catMap[product.categoryId]}
                  onClick={() => navigate(`/catalog/${product.id}`)}
                />
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="mt-10 flex justify-center">
                <Button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  variant="outline"
                  size="lg"
                  className="rounded-xl px-8 font-semibold gap-2 border-primary/20 hover:bg-primary/5 cursor-pointer shadow-xs"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading more products...
                    </>
                  ) : (
                    "Load More Products"
                  )}
                </Button>
              </div>
            )}
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
  const hasPhoto = Boolean(product.photoUrl);
  const isValidModel = Boolean(product.model && !/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(product.model));

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const msg = `Hi Zorba Infotech! I am interested in inquiring about ${product.name}${isValidModel ? ` (Model: ${product.model})` : ""}. Is this item available for quotation / order?`;
    window.open(`https://wa.me/919425010640?text=${encodeURIComponent(msg)}`, "_blank");
  };

  if (hasPhoto) {
    // 1. Visual Card (Products with High-Res Photos)
    return (
      <div
        onClick={onClick}
        className="group relative flex flex-col rounded-2xl border bg-card overflow-hidden cursor-pointer hover:shadow-xl hover:border-primary/30 transition-all duration-300"
      >
        <div className="relative aspect-square overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100/50 dark:from-slate-900/40 dark:to-slate-900/80 p-6 flex items-center justify-center">
          <img
            src={product.photoUrl!}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
            {product.featured && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-semibold text-white shadow-xs">
                <Star className="h-3 w-3 fill-white" /> Featured
              </span>
            )}
            {!product.inStock && (
              <span className="inline-flex items-center rounded-full bg-destructive/90 px-2 py-0.5 text-[11px] font-semibold text-white">
                Out of Stock
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col flex-1 p-4 gap-2">
          <div className="flex items-center justify-between gap-2">
            {categoryName && (
              <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
                {categoryName}
              </span>
            )}
            {product.brand && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {product.brand}
              </span>
            )}
          </div>

          <h3 className="font-bold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
            {product.name}
          </h3>

          {isValidModel && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                Model: {product.model}
              </span>
            </div>
          )}

          <div className="mt-auto pt-2 flex items-center justify-between">
            {product.price != null && product.showPriceOnWebsite !== false ? (
              <span className="text-base font-bold text-primary">
                ₹{product.price.toLocaleString("en-IN")}
              </span>
            ) : (
              <span className="text-xs font-medium text-muted-foreground">Contact for price</span>
            )}
            {product.inStock ? (
              <Badge variant="outline" className="text-[11px] font-semibold text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-800">
                In Stock
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[11px] font-semibold text-slate-400 border-slate-200">
                On Order
              </Badge>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 2. Hardware Spec Card (Products without Photos - High-Density B2B Spec Architecture)
  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col rounded-2xl border bg-card overflow-hidden cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all duration-300"
    >
      {/* Sleek Category & Brand Accent Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100/60 dark:from-slate-900/60 dark:to-slate-900/30 border-b border-border/50 flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-primary uppercase tracking-wider flex items-center gap-1.5 truncate">
          <Package className="h-3.5 w-3.5 text-primary/70 shrink-0" />
          {categoryName || "Hardware"}
        </span>
        {product.brand && (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 shadow-2xs border border-border/40 text-slate-800 dark:text-slate-200 shrink-0">
            {product.brand}
          </span>
        )}
      </div>

      {/* Main Spec Info */}
      <div className="flex flex-col flex-1 p-4 gap-2.5">
        <h3 className="font-bold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors text-slate-900 dark:text-slate-100">
          {product.name}
        </h3>

        {isValidModel && (
          <div>
            <span className="inline-flex items-center text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-200/50 dark:border-slate-700/50">
              SKU / Model: {product.model}
            </span>
          </div>
        )}

        <div className="mt-auto pt-3 border-t border-dashed border-border/60 flex items-center justify-between gap-2">
          <div>
            {product.price != null && product.showPriceOnWebsite !== false ? (
              <span className="text-base font-bold text-primary">
                ₹{product.price.toLocaleString("en-IN")}
              </span>
            ) : (
              <span className="text-xs font-medium text-muted-foreground">Price on Request</span>
            )}
            {product.inStock && (
              <div className="flex items-center gap-1 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block"></span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  In Stock
                </span>
              </div>
            )}
          </div>

          <button
            onClick={handleWhatsApp}
            title="Inquire on WhatsApp"
            className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-2.5 py-1.5 transition-colors shadow-2xs flex items-center gap-1 shrink-0"
          >
            Quote
          </button>
        </div>
      </div>
    </div>
  );
}
