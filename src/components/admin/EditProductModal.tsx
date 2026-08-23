import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Package, Save, Globe, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { getCategories, getProduct, updateProduct } from "@/lib/firestore";
import { toTitleCase, formatModelNumber } from "@/lib/utils";
import type { Category, Product } from "@/lib/types";

interface EditProductModalProps {
  productId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: (product: Product) => void;
}

export default function EditProductModal({
  productId,
  open,
  onOpenChange,
  onUpdated,
}: EditProductModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [product, setProduct] = useState<Product | null>(null);
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [price, setPrice] = useState("");
  const [warranty, setWarranty] = useState("");
  const [description, setDescription] = useState("");
  const [showOnWebsite, setShowOnWebsite] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && productId) {
      loadData();
    }
  }, [open, productId]);

  const loadData = async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const [cats, prod] = await Promise.all([
        getCategories(),
        getProduct(productId),
      ]);
      setCategories(cats);
      if (prod) {
        setProduct(prod);
        setName(prod.name || "");
        setBrand(prod.brand || "");
        setModel(prod.model || "");
        setCategoryId(prod.categoryId || "");
        setPrice(prod.price !== null && prod.price !== undefined ? String(prod.price) : "");
        setWarranty(prod.warranty || "");
        setDescription(prod.description || "");
        setShowOnWebsite(prod.showOnWebsite !== false);
      }
    } catch (err) {
      console.error("Failed to load product for editing:", err);
      toast.error("Failed to load product details");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !product) return;
    if (!name.trim()) {
      toast.error("Product name is required");
      return;
    }

    setSaving(true);
    try {
      const priceNum = price ? parseFloat(price) : null;
      const payload: Partial<Product> = {
        name: toTitleCase(name),
        brand: brand.trim() ? toTitleCase(brand) : "",
        model: formatModelNumber(model),
        categoryId,
        price: priceNum !== null && !isNaN(priceNum) ? priceNum : null,
        warranty: warranty.trim() ? toTitleCase(warranty) : "",
        description: description.trim(),
        showOnWebsite,
      };

      await updateProduct(productId, payload);
      const updated: Product = {
        ...product,
        ...payload,
      };

      toast.success(`Product "${toTitleCase(name)}" updated in catalog`);
      onUpdated?.(updated);
      onOpenChange(false);
    } catch (err: any) {
      console.error("Failed to update product:", err);
      toast.error(err?.message || "Failed to update product");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border-slate-200 dark:border-slate-800 p-6 text-xs">
        <DialogHeader className="p-0 mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
          <DialogTitle className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Package className="h-5 w-5 text-purple-600" />
            <span>Edit Catalog Product</span>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-slate-400">Loading product details...</div>
        ) : (
          <form onSubmit={handleSave} className="space-y-3.5">
            {/* Category */}
            <div>
              <Label className="text-xs font-semibold">Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="h-9 text-xs rounded-xl mt-1 bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Product Name */}
            <div>
              <Label className="text-xs font-semibold">
                Product Name <span className="text-red-500">*</span>
              </Label>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setName((prev) => toTitleCase(prev))}
                placeholder="e.g. ThinkPad T480 Core i5"
                className="h-9 text-xs rounded-xl mt-1 bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              />
            </div>

            {/* Brand & Model */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <Label className="text-xs font-semibold">Brand / Make</Label>
                <Input
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  onBlur={() => setBrand((prev) => toTitleCase(prev))}
                  placeholder="e.g. Lenovo, Dell"
                  className="h-9 text-xs rounded-xl mt-1 bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">
                  Model Number <span className="text-slate-400 font-normal text-[10px]">(no spaces)</span>
                </Label>
                <Input
                  value={model}
                  onChange={(e) => setModel(e.target.value.replace(/\s+/g, "-").toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === " ") {
                      e.preventDefault();
                      setModel((prev) => (prev ? `${prev}-` : ""));
                    }
                  }}
                  placeholder="e.g. T480-20L5"
                  className="h-9 text-xs uppercase font-mono rounded-xl mt-1 bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                />
              </div>
            </div>

            {/* Price & Warranty */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <Label className="text-xs font-semibold">Standard Retail Price (₹)</Label>
                <Input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g. 24000"
                  className="h-9 text-xs rounded-xl mt-1 bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-mono"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Warranty Period</Label>
                <Input
                  value={warranty}
                  onChange={(e) => setWarranty(e.target.value)}
                  onBlur={() => setWarranty((prev) => toTitleCase(prev))}
                  placeholder="e.g. 1 Year Standard"
                  className="h-9 text-xs rounded-xl mt-1 bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <Label className="text-xs font-semibold">Product Description</Label>
              <Textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Key specifications, RAM, SSD, condition, etc."
                className="text-xs rounded-xl mt-1 bg-slate-50/60 dark:bg-slate-950 border-slate-200 dark:border-slate-800 resize-none"
              />
            </div>

            {/* Website Visibility Toggle */}
            <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950">
              <div>
                <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                  Website Listing
                </Label>
                <span className="text-[10px] text-muted-foreground">
                  {showOnWebsite ? "Product is visible in public website catalog" : "Internal ERP & quotations only"}
                </span>
              </div>
              <Switch checked={showOnWebsite} onCheckedChange={setShowOnWebsite} />
            </div>

            <DialogFooter className="p-0 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-8 text-xs rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saving}
                className="h-8 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white gap-1.5"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{saving ? "Saving..." : "Save Product"}</span>
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
