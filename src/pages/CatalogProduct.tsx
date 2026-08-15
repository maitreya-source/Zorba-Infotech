import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { whatsappLink } from "@/lib/contact";
import {
  ArrowLeft,
  Package,
  ExternalLink,
  MessageCircle,
  CheckCircle2,
  XCircle,
  Star,
  ChevronRight,
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getProduct, getCategories } from "@/lib/firestore";
import type { Product, Category } from "@/lib/types";
import { sanitizeExternalUrl } from "@/lib/utils";

export default function CatalogProduct() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!id) { navigate("/catalog"); return; }
      const [prod, cats] = await Promise.all([getProduct(id), getCategories()]);
      if (!prod) { navigate("/catalog"); return; }
      setProduct(prod);
      setCategory(cats.find((c) => c.id === prod.categoryId) ?? null);
      setLoading(false);
    };
    load();
  }, [id, navigate]);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-32">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </Layout>
    );
  }

  if (!product) return null;

  const whatsappText = `Hi Zorba Infotech! I'm interested in: ${product.name}${product.brand ? ` (${product.brand})` : ""}. Please share availability and pricing.`;

  const details = [
    product.brand && { label: "Brand", value: product.brand },
    product.model && { label: "Model", value: product.model },
    product.itemCode && { label: "Item Code", value: product.itemCode },
    product.warranty && { label: "Warranty", value: product.warranty },
    product.serviceCenter && { label: "Service Center", value: product.serviceCenter },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <Layout>
      <SEO
        title={`${product.name} – Zorba Infotech`}
        description={product.description || `Buy ${product.name} at Zorba Infotech Neemuch. ${product.brand ? `Brand: ${product.brand}.` : ""} ${product.price != null ? `Price: ₹${product.price.toLocaleString("en-IN")}.` : "Contact for price."}`}
        path={`/catalog/${product.id}`}
      />

      {/* Breadcrumb */}
      <div className="border-b bg-muted/20">
        <div className="container py-3 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link to="/catalog" className="hover:text-foreground transition-colors">Catalog</Link>
          {category && (
            <>
              <ChevronRight className="h-3.5 w-3.5" />
              <button
                onClick={() => navigate(`/catalog?category=${product.categoryId}`)}
                className="hover:text-foreground transition-colors"
              >
                {category.name}
              </button>
            </>
          )}
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium line-clamp-1">{product.name}</span>
        </div>
      </div>

      <div className="container py-10">
        <Button
          variant="ghost"
          size="sm"
          className="mb-6 gap-1.5 -ml-2"
          onClick={() => navigate("/catalog")}
        >
          <ArrowLeft className="h-4 w-4" /> Back to Catalog
        </Button>

        <div className="grid gap-10 lg:grid-cols-2">
          {/* Left: Image */}
          <div className="relative">
            <div className="aspect-square rounded-2xl border bg-muted/20 flex items-center justify-center overflow-hidden">
              {product.photoUrl ? (
                <img
                  src={product.photoUrl}
                  alt={product.name}
                  className="h-full w-full object-contain p-8"
                />
              ) : (
                <Package className="h-32 w-32 text-muted-foreground/20" />
              )}
            </div>
            {product.featured && (
              <div className="absolute top-4 left-4 flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1 text-sm font-semibold text-white">
                <Star className="h-3.5 w-3.5 fill-white" /> Featured
              </div>
            )}
          </div>

          {/* Right: Details */}
          <div className="flex flex-col gap-5">
            {category && (
              <span className="text-sm font-medium text-primary/70 uppercase tracking-wide">
                {category.name}
              </span>
            )}

            <h1 className="text-2xl font-bold font-display leading-snug md:text-3xl">
              {product.name}
            </h1>

            {/* Stock status */}
            <div className="flex items-center gap-2">
              {product.inStock ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <span className="font-semibold text-emerald-600">In Stock</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-destructive" />
                  <span className="font-semibold text-destructive">Out of Stock</span>
                </>
              )}
            </div>

            {/* Price */}
            {product.price != null ? (
              <div className="text-3xl font-bold text-primary">
                ₹{product.price.toLocaleString("en-IN")}
              </div>
            ) : (
              <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                Price available on request — contact us for a quote.
              </div>
            )}

            {/* Product details */}
            {details.length > 0 && (
              <div className="rounded-xl border bg-card p-4">
                <dl className="space-y-2">
                  {details.map(({ label, value }) => (
                    <div key={label} className="flex gap-2 text-sm">
                      <dt className="w-32 shrink-0 text-muted-foreground">{label}</dt>
                      <dd className="font-medium">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {/* External product URL */}
            {sanitizeExternalUrl(product.productUrl) && (
              <a
                href={sanitizeExternalUrl(product.productUrl)!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View on manufacturer website
              </a>
            )}

            {/* CTA buttons */}
            <div className="flex flex-wrap gap-3 pt-2">
              <a
                href={whatsappLink(whatsappText)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="whatsapp" size="lg" className="gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Enquire on WhatsApp
                </Button>
              </a>
              <a href="tel:+919424899730">
                <Button variant="cta" size="lg">
                  Call: 94248 99730
                </Button>
              </a>
            </div>
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <div className="mt-12 rounded-2xl border bg-card p-6">
            <h2 className="text-lg font-bold font-display mb-3">Description</h2>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          </div>
        )}

        {/* Custom fields / Specifications */}
        {product.customFields?.length > 0 && (
          <div className="mt-6 rounded-2xl border bg-card p-6">
            <h2 className="text-lg font-bold font-display mb-4">Specifications</h2>
            <div className="divide-y rounded-xl border overflow-hidden">
              {product.customFields.map(({ key, value }) => (
                <div key={key} className="flex text-sm">
                  <div className="w-40 shrink-0 bg-muted/30 px-4 py-3 font-medium text-muted-foreground">
                    {key}
                  </div>
                  <div className="flex-1 px-4 py-3">{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
